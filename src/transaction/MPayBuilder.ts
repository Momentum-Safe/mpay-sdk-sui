import { TransactionBlock } from '@mysten/sui.js/transactions';

import { Globals } from '@/common/globals';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamHelper } from '@/transaction/CreateStreamHelper';
import { CreateStreamInfoInternal } from '@/types/client';

// TODO: add vault and admin control related code.
export class MPayBuilder {
  private readonly feeContract: FeeContract;

  private readonly streamContract: StreamContract;

  constructor(public readonly globals: Globals) {
    const config = globals.envConfig.contract;
    this.feeContract = new FeeContract(config, globals);
    this.streamContract = new StreamContract(config, globals);
  }

  createStreams(info: CreateStreamInfoInternal) {
    const helper = new CreateStreamHelper(this.globals, this.feeContract, this.streamContract);
    return helper.buildCreateStreamTransactionBlock(info);
  }

  setAutoClaim(streamId: string, enabled: boolean, coinType: string) {
    const txb = new TransactionBlock();
    return this.streamContract.setAutoClaim(txb, {
      streamId,
      enabled,
      coinType,
    });
  }

  claimStream(streamId: string, coinType: string) {
    const txb = new TransactionBlock();
    return this.streamContract.claimStream(txb, {
      streamId,
      coinType,
    });
  }

  claimStreamByProxy(streamId: string, coinType: string) {
    const txb = new TransactionBlock();
    return this.streamContract.claimStreamByProxy(txb, {
      streamId,
      coinType,
    });
  }

  cancelStream(streamId: string, coinType: string) {
    const txb = new TransactionBlock();
    this.streamContract.cancelStream(txb, {
      streamId,
      coinType,
    });
  }
}
