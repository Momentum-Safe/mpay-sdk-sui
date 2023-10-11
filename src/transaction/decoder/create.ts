import { MoveCallTransaction } from '@mysten/sui.js/src/builder/Transactions';
import { TransactionArgument, TransactionBlock } from '@mysten/sui.js/transactions';
import { normalizeStructTag, normalizeSuiAddress, SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { Globals } from '@/common/globals';
import { InvalidInputError } from '@/error/InvalidInputError';
import { SanityError } from '@/error/SanityError';
import { decodeMetadata } from '@/stream/metadata';
import { CreateStreamHelper } from '@/transaction/builder/CreateStreamHelper';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { MoveCallHelper } from '@/transaction/decoder/moveCall';
import { CreateStreamInfo, RecipientWithAmount } from '@/types';
import { CoinMerge, DecodedCreateStream, StreamTransactionType } from '@/types/decode';

export class CreateStreamDecodeHelper {
  constructor(
    public readonly globals: Globals,
    public readonly txb: TransactionBlock,
  ) {}

  decode(): DecodedCreateStream {
    const streamInfo = this.decodeCreateStreamInfo();
    const fees = this.createStreamHelper().calculateCreateStreamFees(streamInfo);
    const coinMerges = this.getCoinMerges();
    return {
      type: StreamTransactionType.CREATE_STREAM,
      info: streamInfo,
      fees,
      coinMerges,
    };
  }

  private decodeCreateStreamInfo(): CreateStreamInfo {
    const moveCalls = this.createStreamTransactions();
    const infos = moveCalls.map((moveCall) => this.getCreationInfoFromMoveCall(moveCall));
    return this.aggregateGroupStreamInfo(infos);
  }

  private createStreamTransactions(): MoveCallHelper[] {
    const txs = this.transactions.filter(
      (tx) => tx.kind === 'MoveCall' && tx.target === this.contract.createStreamTarget,
    ) as MoveCallTransaction[];
    if (txs.length === 0) {
      throw new SanityError('No create stream transactions');
    }
    return txs.map((tx) => new MoveCallHelper(tx));
  }

  private getCreationInfoFromMoveCall(moveCall: MoveCallHelper): SingleStreamCreationInfo {
    const metadata = moveCall.inputStringArgument(4);
    const { name, groupId } = decodeMetadata(metadata);

    const recipient = moveCall.inputAddressArgument(5);
    const timeStart = moveCall.inputU64Argument(6);
    const cliff = moveCall.inputU64Argument(7);
    const epochInterval = moveCall.inputU64Argument(8);
    const totalEpoch = moveCall.inputU64Argument(9);
    const amountPerEpoch = moveCall.inputU64Argument(10);
    const cancelable = moveCall.inputBoolArgument(11);
    const coinType = moveCall.typeArg(0);

    return {
      name,
      groupId,
      recipient,
      timeStart,
      cliff,
      epochInterval,
      totalEpoch,
      amountPerEpoch,
      cancelable,
      coinType,
    };
  }

  private aggregateGroupStreamInfo(infos: SingleStreamCreationInfo[]): CreateStreamInfo {
    const commonInfoSet = new Set(
      infos.map((info) =>
        JSON.stringify({
          name: info.name,
          groupId: info.groupId,
          timeStart: String(info.timeStart),
          epochInterval: String(info.epochInterval),
          totalEpoch: String(info.totalEpoch),
          cancelable: info.cancelable,
          coinType: info.coinType,
        }),
      ),
    );
    if (commonInfoSet.size !== 1) {
      throw new InvalidInputError('Stream group not have common info');
    }
    const recipients: RecipientWithAmount[] = infos.map((info) => ({
      address: info.recipient,
      amountPerStep: info.amountPerEpoch,
      cliffAmount: info.cliff,
    }));
    return {
      name: infos[0].name,
      coinType: infos[0].coinType,
      recipients,
      interval: infos[0].epochInterval,
      steps: infos[0].totalEpoch,
      startTimeMs: infos[0].timeStart,
      cancelable: infos[0].cancelable,
    };
  }

  private getCoinMerges() {
    const createStreamTx = this.createStreamTransactions()[0];
    return this.getCoinMergeForCreateStream(createStreamTx);
  }

  private getCoinMergeForCreateStream(moveCall: MoveCallHelper) {
    const coinType = normalizeStructTag(moveCall.typeArg(0));

    const paymentCoin = moveCall.txArgument(2);
    const paymentCoinMerge = this.getCoinMergeFromNestedResult(paymentCoin, coinType);

    if (coinType === normalizeStructTag(SUI_TYPE_ARG)) {
      return [paymentCoinMerge];
    }
    const flatFeeCoin = moveCall.txArgument(3);
    const flatCoinMerge = this.getCoinMergeFromNestedResult(flatFeeCoin, normalizeStructTag(SUI_TYPE_ARG));
    return [paymentCoinMerge, flatCoinMerge];
  }

  private getCoinMergeFromNestedResult(coinArg: TransactionArgument, coinType: string): CoinMerge {
    if (coinArg.kind === 'GasCoin') {
      return {
        primary: 'GAS',
        coinType,
      };
    }
    if (coinArg.kind === 'Input') {
      return {
        primary: coinArg.value,
        coinType,
      };
    }
    if (coinArg.kind === 'NestedResult') {
      // Expect parent is split coin transaction.
      const parentTx = this.transactions[coinArg.index];
      if (parentTx.kind !== 'SplitCoins') {
        throw new InvalidInputError(`Transaction type not expected. Expect SplitCoins, got ${parentTx.kind}`);
      }
      return this.getCoinMergeFromNestedResult(parentTx.coin, coinType);
    }
    if (coinArg.kind === 'Result') {
      // Expect parent is merge coin transaction.
      const parentTx = this.transactions[coinArg.index];
      if (parentTx.kind !== 'MergeCoins') {
        throw new InvalidInputError(`Transaction type not expected. Expect MergeCoins, got ${parentTx.kind}`);
      }
      return {
        primary: this.getInputObjectAddress(parentTx.destination),
        merged: parentTx.sources.map((arg) => this.getInputObjectAddress(arg)),
        coinType,
      };
    }
    throw new Error(`Unknown argument kind`);
  }

  private getInputObjectAddress(arg: TransactionArgument) {
    if (arg.kind !== 'Input' || arg.type !== 'object') {
      throw new InvalidInputError('Not input object type');
    }
    return normalizeSuiAddress(arg.value as string);
  }

  private mergeCoinTransactions() {
    return this.transactions.filter((tx) => tx.kind === 'MergeCoins');
  }

  private get transactions() {
    return this.txb.blockData.transactions;
  }

  private get contract() {
    return new StreamContract(this.globals.envConfig.contract, this.globals);
  }

  private get feeContract() {
    return new FeeContract(this.globals.envConfig.contract, this.globals);
  }

  private createStreamHelper() {
    return new CreateStreamHelper(this.globals, this.feeContract, this.contract);
  }
}

interface SingleStreamCreationInfo {
  name: string;
  groupId: string;
  recipient: string;
  timeStart: bigint;
  cliff: bigint;
  epochInterval: bigint;
  totalEpoch: bigint;
  amountPerEpoch: bigint;
  cancelable: boolean;
  coinType: string;
}
