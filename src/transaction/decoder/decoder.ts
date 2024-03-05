import { MoveCallTransaction } from '@mysten/sui.js/dist/cjs/builder';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { Globals } from '@/common/globals';
import { isSameTarget } from '@/sui/utils';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamDecodeHelper } from '@/transaction/decoder/create';
import { MoveCallHelper } from '@/transaction/decoder/moveCall';
import {
  DecodedCancelStream,
  DecodedClaimByProxy,
  DecodedClaimStream,
  DecodedCreateStream,
  DecodedSetAutoClaim,
  StreamDecodedTransaction,
  StreamTransactionType,
} from '@/types/decode';

export class StreamTransactionDecoder {
  static decodeTransaction(globals: Globals, txb: TransactionBlock): StreamDecodedTransaction {
    const helper = new DecodeHelper(globals, txb);
    return helper.decode();
  }
}

export class DecodeHelper {
  private readonly contract: StreamContract;

  constructor(
    public readonly globals: Globals,
    public readonly txb: TransactionBlock,
  ) {
    this.contract = new StreamContract(globals.envConfig.contract, globals);
  }

  decode(): StreamDecodedTransaction {
    if (this.isCreateStreamTransaction()) {
      return this.decodeCreateStreamTransaction();
    }
    if (this.isClaimByProxyTransaction()) {
      return this.decodeClaimByProxyTransaction();
    }
    if (this.isSetAutoClaimTransaction()) {
      return this.decodeSetAutoClaimTransaction();
    }
    if (this.isCancelStreamTransaction()) {
      return this.decodeCancelStreamTransaction();
    }
    if (this.isClaimStreamTransaction()) {
      return this.decodeClaimTransaction();
    }
    return undefined;
  }

  private get transactions() {
    return this.txb.blockData.transactions;
  }

  private isCreateStreamTransaction() {
    const createStreamIndex = this.transactions.findIndex(
      (tx) => tx.kind === 'MoveCall' && isSameTarget(tx.target, this.contract.createStreamTarget),
    );
    return createStreamIndex !== -1;
  }

  private isSetAutoClaimTransaction() {
    return (
      this.transactions.length === 1 &&
      this.transactions[0].kind === 'MoveCall' &&
      isSameTarget(this.transactions[0].target, this.contract.setAutoClaimTarget)
    );
  }

  private isCancelStreamTransaction() {
    return (
      this.transactions.length === 1 &&
      this.transactions[0].kind === 'MoveCall' &&
      isSameTarget(this.transactions[0].target, this.contract.cancelStreamTarget)
    );
  }

  private isClaimStreamTransaction(): boolean {
    return (
      this.transactions.length === 1 &&
      this.transactions[0].kind === 'MoveCall' &&
      isSameTarget(this.transactions[0].target, this.contract.claimStreamTarget)
    );
  }

  private isClaimByProxyTransaction(): boolean {
    return (
      this.transactions.length === 1 &&
      this.transactions[0].kind === 'MoveCall' &&
      isSameTarget(this.transactions[0].target, this.contract.claimStreamByProxyTarget)
    );
  }

  private decodeCreateStreamTransaction(): DecodedCreateStream {
    const helper = new CreateStreamDecodeHelper(this.globals, this.txb);
    return helper.decode();
  }

  private decodeSetAutoClaimTransaction(): DecodedSetAutoClaim {
    const streamId = this.helper.decodeSharedObjectId(0);
    const enabled = this.helper.decodeInputBool(1);
    return {
      type: StreamTransactionType.SET_AUTO_CLAIM,
      streamId,
      enabled,
    };
  }

  private decodeClaimTransaction(): DecodedClaimStream {
    const streamId = this.helper.decodeSharedObjectId(0);
    return {
      type: StreamTransactionType.CLAIM,
      streamId,
    };
  }

  private decodeClaimByProxyTransaction(): DecodedClaimByProxy {
    const streamId = this.helper.decodeSharedObjectId(0);
    return {
      type: StreamTransactionType.CLAIM_BY_PROXY,
      streamId,
    };
  }

  private decodeCancelStreamTransaction(): DecodedCancelStream {
    const streamId = this.helper.decodeSharedObjectId(0);
    return {
      type: StreamTransactionType.CANCEL,
      streamId,
    };
  }

  private get helper() {
    const moveCall = this.transactions[0] as MoveCallTransaction;
    return new MoveCallHelper(moveCall, this.txb);
  }
}
