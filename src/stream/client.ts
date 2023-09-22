import { SuiObjectChangeCreated, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { normalizeStructTag } from '@mysten/sui.js/utils';

import { Env, EnvConfigOptions } from '@/common/env';
import { Globals } from '@/common/globals';
import { encodeMetadata } from '@/stream/metadata';
import { Stream } from '@/stream/Stream';
import { MPayBuilder } from '@/transaction/MPayBuilder';
import { CreateStreamInfo, IMPayClient, IncomingStreamQuery, OutgoingStreamQuery } from '@/types/client';
import { IStream, IStreamGroup } from '@/types/IStream';
import { IMSafeAccount, ISingleWallet } from '@/types/wallet';
import { MSafeAccountAdapter } from '@/wallet/MSafeAccountAdapter';
import { SingleWalletAdapter } from '@/wallet/SingleWalletAdapter';

export class MPayClient implements IMPayClient {
  public readonly globals: Globals;

  constructor(env: Env, options?: EnvConfigOptions) {
    this.globals = Globals.new(env, options);
  }

  connectSingleWallet(wallet: ISingleWallet) {
    const adapter = new SingleWalletAdapter(wallet, this.globals.suiClient);
    this.globals.connectWallet(adapter);
  }

  connectMSafeAccount(msafe: IMSafeAccount) {
    const adapter = new MSafeAccountAdapter(msafe);
    this.globals.connectWallet(adapter);
  }

  builder() {
    return new MPayBuilder(this.globals);
  }

  // If single wallet, return created stream Ids. Else return void for multi-sig.
  async createStream(info: CreateStreamInfo): Promise<string[] | undefined> {
    const txb = await this.builder().createStreams({
      metadata: encodeMetadata({
        name: info.name,
        groupId: info.groupId,
      }),
      coinType: normalizeStructTag(info.coinType),
      recipients: info.recipients.map((recipient) => ({
        address: recipient.address,
        cliffAmount: recipient.cliffAmount,
        amountPerEpoch: recipient.amountPerStep,
      })),
      epochInterval: info.interval,
      numberEpoch: info.steps,
      startTime: info.startTimeMs,
      cancelable: info.cancelable,
    });
    const res = await this.wallet.execute(txb);
    if (this.wallet.type === 'msafe') {
      return undefined;
    }
    return (res as SuiTransactionBlockResponse)
      .objectChanges!.filter(
        (change) =>
          change.type === 'created' &&
          change.objectType.startsWith(`${this.globals.envConfig.contract.contractId}::stream::Stream`),
      )
      .map((change) => (change as SuiObjectChangeCreated).objectId);
  }

  async getStream(streamId: string) {
    return Stream.new(this.globals, streamId);
  }

  async executeTransactionBlock(txb: TransactionBlock) {
    return this.wallet.execute(txb);
  }

  async inspectTransactionBlock(txb: TransactionBlock) {
    return this.wallet.inspect(txb);
  }

  async getIncomingStreams(query?: IncomingStreamQuery): Promise<IStream[]> {
    return [];
  }

  async getOutgoingStreams(query?: OutgoingStreamQuery): Promise<(IStream | IStreamGroup)[]> {
    return [];
  }

  get wallet() {
    return this.globals.wallet;
  }
}
