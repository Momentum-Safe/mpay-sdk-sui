import { TransactionBlock } from '@mysten/sui.js/transactions';
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui.js/utils';

import { Env, EnvConfigOptions } from '@/common/env';
import { Globals } from '@/common/globals';
import { MPayHelper } from '@/stream/helper';
import { PagedStreamListIterator } from '@/stream/query';
import { Stream } from '@/stream/Stream';
import { MPayBuilder } from '@/transaction/builder/MPayBuilder';
import { StreamFilterStatus } from '@/types';
import {
  CreateStreamInfo,
  IMPayClient,
  IncomingStreamQuery,
  IPagedStreamListIterator,
  OutgoingStreamQuery,
} from '@/types/client';
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
    return this.builder().createStreams(info);
  }

  async getStream(streamId: string) {
    return Stream.new(this.globals, streamId);
  }

  async getIncomingStreams(query?: IncomingStreamQuery, pageSize: number = 10): Promise<IPagedStreamListIterator> {
    return PagedStreamListIterator.newIncoming({
      globals: this.globals,
      query,
      pageSize,
    });
  }

  async getOutgoingStreams(query?: OutgoingStreamQuery, pageSize: number = 10): Promise<IPagedStreamListIterator> {
    return PagedStreamListIterator.newOutgoing({
      globals: this.globals,
      query,
      pageSize,
    });
  }

  async getCoinTypesForStreamFilter(): Promise<string[]> {
    const address = await this.wallet.address();
    const coinTypes = await this.globals.backend.getAllCoinTypes(address);
    return coinTypes.map((coinType) => normalizeStructTag(coinType));
  }

  async getRecipientsForStreamFilter(options?: StreamFilterStatus): Promise<string[]> {
    const address = await this.wallet.address();
    const recipients = await this.globals.backend.getAllRecipients(address, options);
    return recipients.map((recipient) => normalizeSuiAddress(recipient));
  }

  async getCreatorsForStreamFilter(options?: StreamFilterStatus): Promise<string[]> {
    const address = await this.wallet.address();
    const creators = await this.globals.backend.getAllSenders(address, options);
    return creators.map((creator) => normalizeSuiAddress(creator));
  }

  get wallet() {
    return this.globals.wallet;
  }

  private builder() {
    return new MPayBuilder(this.globals);
  }
}
