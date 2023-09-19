import { TransactionArgument, TransactionBlock } from '@mysten/sui.js/transactions';
import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { ContractConfig } from '@/common/env';
import { Globals } from '@/common/globals';
import { isSameCoinType } from '@/sui/utils';
import { FEE_DENOMINATOR, FEE_NUMERATOR, FLAT_FEE_SUI } from '@/transaction/const';
import { ResultRef } from '@/transaction/contracts/common';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { InspectViewer } from '@/transaction/contracts/InspectViewer';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamInfoInternal, RecipientInfoInternal } from '@/types/client';
import { CoinRequest, GAS_OBJECT_SPEC } from '@/types/wallet';

export interface PaymentWithFee {
  totalAmount: bigint;
  streamFeeAmount: bigint;
  flatFeeAmount: bigint;
}

export class CreateStreamBuilder {
  private readonly feeContract: FeeContract;

  private readonly streamContract: StreamContract;

  constructor(
    public readonly globals: Globals,
    public readonly config: ContractConfig,
  ) {
    this.feeContract = new FeeContract(config, globals);
    this.streamContract = new StreamContract(config, globals);
  }

  async buildCreateStreamTransactionBlock(info: CreateStreamInfoInternal): Promise<TransactionBlock> {
    const txb = new TransactionBlock();
    const paymentWithFee = this.calculateFees(info);
    const coinReqs = this.getCreateStreamCoinRequests(info, paymentWithFee);

    const paymentMergedObject = await this.addMergeCoins(txb, coinReqs[0]);
    let flatFeeMergedObject: TransactionArgument;
    if (coinReqs.length > 1) {
      flatFeeMergedObject = await this.addMergeCoins(txb, coinReqs[1]);
    } else {
      flatFeeMergedObject = paymentMergedObject;
    }

    // Create streams
    for (let i = 0; i < info.recipients.length; i++) {
      const recipient = info.recipients[i];
      const paymentAmount = this.amountForRecipient(recipient, info.numberEpoch);
      const feeAmount = this.getStreamFeeLocal(paymentAmount);
      const [paymentCoin] = txb.splitCoins(paymentMergedObject, [txb.pure(paymentAmount + feeAmount, 'u64')]);
      const [flatFeeCoin] = txb.splitCoins(flatFeeMergedObject, [txb.pure(this.flatSuiFee, 'u64')]);
      this.streamContract.createStream(txb, {
        paymentCoin: new ResultRef(paymentCoin as TransactionArgument & TransactionArgument[]),
        flatFeeCoin: new ResultRef(flatFeeCoin as TransactionArgument & TransactionArgument[]),
        metadata: info.metadata,
        recipient: recipient.address,
        timeStart: info.startTime,
        cliff: recipient.cliffAmount,
        epochInterval: info.epochInterval,
        numEpoch: info.numberEpoch,
        amountPerEpoch: recipient.amountPerEpoch,
        cancelable: info.cancelable,
        coinType: info.coinType,
      });
    }
    return txb;
  }

  private async addMergeCoins(txb: TransactionBlock, coinReq: CoinRequest): Promise<TransactionArgument> {
    const coins = await this.wallet.requestCoin(coinReq);
    let mergedCoin: TransactionArgument;
    if (coins.mergedCoins && coins.mergedCoins.length) {
      mergedCoin = txb.mergeCoins(
        txb.object(coins.primaryCoin),
        coins.mergedCoins.map((coinId) => txb.object(coinId)),
      );
    } else if (coins.primaryCoin === GAS_OBJECT_SPEC) {
      mergedCoin = txb.gas;
    } else {
      mergedCoin = txb.object(coins.primaryCoin);
    }
    return mergedCoin;
  }

  getCreateStreamCoinRequests(info: CreateStreamInfoInternal, payment: PaymentWithFee): CoinRequest[] {
    const streamCoinType = info.coinType;

    if (isSameCoinType(streamCoinType, SUI_TYPE_ARG)) {
      return [
        {
          coinType: streamCoinType,
          amount: payment.totalAmount + payment.streamFeeAmount + payment.flatFeeAmount,
        },
      ];
    }
    return [
      {
        coinType: streamCoinType,
        amount: payment.totalAmount + payment.streamFeeAmount,
      },
      {
        coinType: SUI_TYPE_ARG,
        amount: payment.flatFeeAmount,
      },
    ];
  }

  calculateFees(info: CreateStreamInfoInternal): PaymentWithFee {
    const streamPayment = info.recipients.reduce(
      (sum, recipient) => {
        const totalAmount = this.amountForRecipient(recipient, info.numberEpoch);
        const fee = this.getStreamFeeLocal(totalAmount);
        return {
          totalAmount: sum.totalAmount + totalAmount,
          streamFeeAmount: sum.streamFeeAmount + fee,
        };
      },
      {
        totalAmount: 0n,
        streamFeeAmount: 0n,
      },
    );
    const flatFeeAmount = BigInt(info.recipients.length) * this.flatSuiFee;
    return {
      flatFeeAmount,
      ...streamPayment,
    };
  }

  private amountForRecipient(recipient: RecipientInfoInternal, numEpoch: bigint) {
    return recipient.amountPerEpoch * numEpoch + recipient.cliffAmount;
  }

  get flatSuiFee() {
    return FLAT_FEE_SUI;
  }

  getStreamFeeLocal(streamAmount: bigint) {
    return (streamAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
  }

  async getStreamFeeRemote(streamAmount: bigint) {
    const txb = this.feeContract.streamingFee(new TransactionBlock(), streamAmount);
    const res = await this.wallet.inspect(txb);
    const iv = new InspectViewer(res);
    return iv.getU64();
  }

  get wallet() {
    return this.globals.wallet;
  }
}