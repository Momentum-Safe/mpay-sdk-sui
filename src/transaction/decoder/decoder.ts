import { MoveCallTransaction } from '@mysten/sui.js/src/builder/Transactions';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { Globals } from '@/common/globals';
import { Stream } from '@/stream';
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
  static async decodeTransaction(globals: Globals, txb: TransactionBlock): Promise<StreamDecodedTransaction> {
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

  async decode(): Promise<StreamDecodedTransaction> {
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
      (tx) => tx.kind === 'MoveCall' && tx.target === this.contract.createStreamTarget,
    );
    return createStreamIndex !== -1;
  }

  private isSetAutoClaimTransaction() {
    return (
      this.transactions.length === 1 &&
      this.transactions[0].kind === 'MoveCall' &&
      this.transactions[0].target === this.contract.setAutoClaimTarget
    );
  }

  private isCancelStreamTransaction() {
    return (
      this.transactions.length === 1 &&
      this.transactions[0].kind === 'MoveCall' &&
      this.transactions[0].target === this.contract.cancelStreamTarget
    );
  }

  private isClaimStreamTransaction(): boolean {
    return (
      this.transactions.length === 1 &&
      this.transactions[0].kind === 'MoveCall' &&
      this.transactions[0].target === this.contract.claimStreamTarget
    );
  }

  private isClaimByProxyTransaction(): boolean {
    return (
      this.transactions.length === 1 &&
      this.transactions[0].kind === 'MoveCall' &&
      this.transactions[0].target === this.contract.claimStreamByProxyTarget
    );
  }

  private decodeCreateStreamTransaction(): DecodedCreateStream {
    const helper = new CreateStreamDecodeHelper(this.globals, this.txb);
    return helper.decode();
  }

  private async decodeSetAutoClaimTransaction(): Promise<DecodedSetAutoClaim> {
    const streamId = this.helper.inputObjectArgument(0);
    const enabled = this.helper.inputBoolArgument(1);
    const stream = await Stream.new(this.globals, streamId);
    return {
      type: StreamTransactionType.SET_AUTO_CLAIM,
      streamInfo: stream.info,
      enabled,
    };
  }

  private async decodeClaimTransaction(): Promise<DecodedClaimStream> {
    const streamId = this.helper.inputObjectArgument(0);
    const stream = await Stream.new(this.globals, streamId);
    return {
      type: StreamTransactionType.CLAIM,
      streamInfo: stream.info,
    };
  }

  private async decodeClaimByProxyTransaction(): Promise<DecodedClaimByProxy> {
    const streamId = this.helper.inputObjectArgument(0);
    const stream = await Stream.new(this.globals, streamId);
    return {
      type: StreamTransactionType.CLAIM_BY_PROXY,
      streamInfo: stream.info,
    };
  }

  private async decodeCancelStreamTransaction(): Promise<DecodedCancelStream> {
    const streamId = this.helper.inputObjectArgument(0);
    const stream = await Stream.new(this.globals, streamId);
    return {
      type: StreamTransactionType.CANCEL,
      streamInfo: stream.info,
    };
  }

  private get helper() {
    const moveCall = this.transactions[0] as MoveCallTransaction;
    return new MoveCallHelper(moveCall);
  }
}
