import { TransactionArgument, Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag, SUI_TYPE_ARG } from '@mysten/sui/utils';

import { Globals } from '@/common/globals';
import { InvalidInputError } from '@/error/InvalidInputError';
import { SanityError } from '@/error/SanityError';
import { decodeMetadata } from '@/stream/metadata';
import { isSameTarget } from '@/sui/utils';
import type { MoveCallCommand } from '@/sui/transaction-data';
import {
  getInputArgumentIndex,
  getMoveCallTarget,
  getNestedResultIndices,
  getTransactionArgumentKind,
  getTransactionCommands,
  getTransactionInputs,
  isMergeCoinsCommand,
  isMoveCallCommand,
  isSplitCoinsCommand,
} from '@/sui/transaction-data';
import { CreateStreamHelper } from '@/transaction/builder/CreateStreamHelper';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { MoveCallHelper } from '@/transaction/decoder/moveCall';
import { CreateStreamInfo, RecipientWithAmount } from '@/types';
import { CoinMerge, DecodedCreateStream, StreamTransactionType } from '@/types/decode';

export class CreateStreamDecodeHelper {
  constructor(
    public readonly globals: Globals,
    public readonly txb: Transaction,
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
      (tx) => isMoveCallCommand(tx) && isSameTarget(getMoveCallTarget(tx), this.contract.createStreamTarget),
    );
    if (txs.length === 0) {
      throw new SanityError('No create stream transactions');
    }
    return txs.map((tx) => new MoveCallHelper(tx as MoveCallCommand, this.txb));
  }

  private getCreationInfoFromMoveCall(moveCall: MoveCallHelper): SingleStreamCreationInfo {
    const metadata = moveCall.decodeInputString(4);
    const { name, groupId } = decodeMetadata(metadata);

    const recipient = moveCall.decodeInputAddress(5);
    const timeStart = moveCall.decodeInputU64(6);
    const cliff = moveCall.decodeInputU64(7);
    const epochInterval = moveCall.decodeInputU64(8);
    const totalEpoch = moveCall.decodeInputU64(9);
    const amountPerEpoch = moveCall.decodeInputU64(10);
    const cancelable = moveCall.decodeInputBool(11);
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
    const coinType = moveCall.typeArg(0);

    const paymentCoin = moveCall.txArg(2);
    const paymentCoinMerge = this.getCoinMergeFromNestedResult(paymentCoin, coinType, moveCall);

    if (coinType === normalizeStructTag(SUI_TYPE_ARG)) {
      return [paymentCoinMerge];
    }
    const flatFeeCoin = moveCall.txArg(3);
    const flatCoinMerge = this.getCoinMergeFromNestedResult(flatFeeCoin, normalizeStructTag(SUI_TYPE_ARG), moveCall);
    return [paymentCoinMerge, flatCoinMerge];
  }

  private getCoinMergeFromNestedResult(
    coinArg: TransactionArgument,
    coinType: string,
    moveCall: MoveCallHelper,
  ): CoinMerge {
    const argKind = getTransactionArgumentKind(coinArg);
    if (argKind === 'GasCoin') {
      return {
        primary: 'GAS',
        coinType,
      };
    }
    if (argKind === 'Input') {
      const arg = this.getInputArg(coinArg);
      const objectId = MoveCallHelper.getOwnedObjectId(arg);

      const mergeTx = this.transactions.find((tx) => {
        if (!isMergeCoinsCommand(tx)) {
          return false;
        }
        const destination = tx.MergeCoins.destination;
        if (getTransactionArgumentKind(destination) !== 'Input') {
          throw new Error('merge coin destination not Input type');
        }
        const primaryCoinInput = this.getInputArg(destination);
        return MoveCallHelper.getOwnedObjectId(primaryCoinInput) === objectId;
      });
      if (!mergeTx || !isMergeCoinsCommand(mergeTx)) {
        return {
          primary: objectId,
          coinType,
        };
      }
      return {
        primary: objectId,
        merged: mergeTx.MergeCoins.sources.map((sourceArg) => {
          const sourceInputArg = this.getInputArg(sourceArg);
          return MoveCallHelper.getOwnedObjectId(sourceInputArg);
        }),
        coinType,
      };
    }
    if (argKind === 'NestedResult') {
      const [parentIndex] = getNestedResultIndices(coinArg);
      const parentTx = this.transactions[parentIndex];
      if (!isSplitCoinsCommand(parentTx)) {
        throw new InvalidInputError(`Transaction type not expected. Expect SplitCoins, got ${parentTx.$kind}`);
      }
      return this.getCoinMergeFromNestedResult(parentTx.SplitCoins.coin, coinType, moveCall);
    }
    if (argKind === 'Result') {
      throw new Error('Result type not expected for coin inputs');
    }
    throw new Error('Unknown argument kind');
  }

  private get transactions() {
    return getTransactionCommands(this.txb);
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

  private getInputArg(arg: TransactionArgument) {
    if (getTransactionArgumentKind(arg) !== 'Input') {
      throw new Error('not input type');
    }
    return getTransactionInputs(this.txb)[getInputArgumentIndex(arg)];
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
