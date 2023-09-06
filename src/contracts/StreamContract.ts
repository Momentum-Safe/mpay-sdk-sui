import { TransactionBlock } from '@mysten/sui.js/transactions';

import { ContractConfig } from '@/common/env';
import { Globals } from '@/common/globals';
import { BaseContract } from '@/contracts/BaseContract';
import { MoveNumber, ObjectID, Ref } from '@/contracts/common';

export class StreamContract extends BaseContract {
  static ModuleName = 'stream';

  static MethodName = {
    create_stream: 'create_stream',
    set_auto_claim: 'set_auto_claim',
    cancel_stream: 'cancel_stream',
    claim_stream: 'claim_stream',
    claim_stream_by_proxy: 'claim_stream_by_proxy',
  } as const;

  constructor(
    public readonly config: ContractConfig,
    public readonly globals: Globals,
  ) {
    super(StreamContract.ModuleName, config, globals);
  }

  createStream(
    txb: TransactionBlock,
    input: {
      paymentCoin: Ref<ObjectID>;
      flatFeeCoin: Ref<ObjectID>;
      metadata: string;
      recipient: string;
      time_start: Ref<MoveNumber>;
      cliff: Ref<MoveNumber>;
      epochInterval: Ref<MoveNumber>;
      totalEpoch: Ref<MoveNumber>;
      amountPerEpoch: Ref<MoveNumber>;
      cancelable: boolean;
      coinType: string;
    },
  ) {
    const feeObject = this.feeObject();
    const vaultObject = this.vaultObject();
    const paymentCoinObject = this.makeObject(input.paymentCoin);
    const flatFeeObject = this.makeObject(input.flatFeeCoin);
    const clockObject = this.clockObject();
    return this.addContractCall(txb, {
      method: StreamContract.MethodName.create_stream,
      arguments: [
        feeObject,
        vaultObject,
        paymentCoinObject,
        flatFeeObject,
        input.metadata,
        input.recipient,
        input.time_start,
        input.cliff,
        input.epochInterval,
        input.totalEpoch,
        input.amountPerEpoch,
        input.cancelable,
        clockObject,
      ],
      typeArgs: [],
    });
  }

  setAutoClaim(
    txb: TransactionBlock,
    input: {
      streamID: Ref<ObjectID>;
      enabled: boolean;
      coinType: string;
    },
  ) {
    const streamObject = this.makeObject(input.streamID);
    return this.addContractCall(txb, {
      method: StreamContract.MethodName.set_auto_claim,
      arguments: [streamObject, input.enabled],
      typeArgs: [input.coinType],
    });
  }

  cancelStream(
    txb: TransactionBlock,
    input: {
      streamID: Ref<ObjectID>;
      coinType: string;
    },
  ) {
    const streamObject = this.makeObject(input.streamID);
    const clockObject = this.clockObject();
    return this.addContractCall(txb, {
      method: StreamContract.MethodName.cancel_stream,
      arguments: [streamObject, clockObject],
      typeArgs: [input.coinType],
    });
  }

  claimStream(
    txb: TransactionBlock,
    input: {
      streamID: Ref<ObjectID>;
      coinType: string;
    },
  ) {
    const streamObject = this.makeObject(input.streamID);
    const clockObject = this.clockObject();
    return this.addContractCall(txb, {
      method: StreamContract.MethodName.claim_stream,
      arguments: [streamObject, clockObject],
      typeArgs: [input.coinType],
    });
  }

  claimStreamByProxy(
    txb: TransactionBlock,
    input: {
      streamID: Ref<ObjectID>;
      coinType: string;
    },
  ) {
    const streamObject = this.makeObject(input.streamID);
    const vaultObject = this.vaultObject();
    const feeObject = this.feeObject();
    const clockObject = this.clockObject();
    return this.addContractCall(txb, {
      method: StreamContract.MethodName.claim_stream_by_proxy,
      arguments: [streamObject, vaultObject, feeObject, clockObject],
      typeArgs: [input.coinType],
    });
  }
}
