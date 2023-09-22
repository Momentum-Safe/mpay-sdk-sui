import { TransactionBlock } from '@mysten/sui.js/transactions';

import { Env, EnvConfigOptions } from '@/common/env';
import { Globals } from '@/common/globals';
import { MPayHelper } from '@/stream/helper';
import { StreamListIterator } from '@/stream/query';
import { Stream } from '@/stream/Stream';
import { CreateStreamHelper } from '@/transaction/CreateStreamHelper';
import { MPayBuilder } from '@/transaction/MPayBuilder';
import { CreateStreamInfo, IMPayClient, IncomingStreamQuery, OutgoingStreamQuery } from '@/types/client';
import { IMSafeAccount, ISingleWallet } from '@/types/wallet';
import { MSafeAccountAdapter } from '@/wallet/MSafeAccountAdapter';
import { SingleWalletAdapter } from '@/wallet/SingleWalletAdapter';

export class MPayClient implements IMPayClient {
  public readonly globals: Globals;

  public readonly helper: MPayHelper;

  constructor(env: Env, options?: EnvConfigOptions) {
    this.globals = Globals.new(env, options);
    this.helper = new MPayHelper(this.globals);
  }

  connectSingleWallet(wallet: ISingleWallet) {
    const adapter = new SingleWalletAdapter(wallet, this.globals.suiClient);
    this.globals.connectWallet(adapter);
  }

  connectMSafeAccount(msafe: IMSafeAccount) {
    const adapter = new MSafeAccountAdapter(msafe);
    this.globals.connectWallet(adapter);
  }

  async createStream(info: CreateStreamInfo): Promise<TransactionBlock> {
    const infoInternal = CreateStreamHelper.convertCreateStreamInfoToInternal(info);
    return this.builder().createStreams(infoInternal);
  }

  async getStream(streamId: string) {
    return Stream.new(this.globals, streamId);
  }

  async getIncomingStreams(query?: IncomingStreamQuery): Promise<StreamListIterator> {
    return StreamListIterator.newIncoming({ globals: this.globals, query });
  }

  async getOutgoingStreams(query?: OutgoingStreamQuery): Promise<StreamListIterator> {
    return StreamListIterator.newOutgoing({ globals: this.globals, query });
  }

  get wallet() {
    return this.globals.wallet;
  }

  private builder() {
    return new MPayBuilder(this.globals);
  }
}
