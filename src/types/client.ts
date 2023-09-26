import { CoinBalance, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { DateTime, Duration } from 'luxon';

import { SuiIterator } from '@/sui/iterator/iterator';
import { IStreamGroup, StreamStatus, IStream } from '@/types/stream';
import { IMSafeAccount, ISingleWallet } from '@/types/wallet';

export interface IMPayClient {
  helper: IMPayHelper;

  connectSingleWallet(wallet: ISingleWallet): void;
  connectMSafeAccount(msafe: IMSafeAccount): void;

  getStream(streamId: string): Promise<IStream>;
  getIncomingStreams(query?: IncomingStreamQuery, pageSize?: number): Promise<IPagedStreamListIterator>;
  getOutgoingStreams(query?: OutgoingStreamQuery, pageSize?: number): Promise<IPagedStreamListIterator>;

  createStream(info: CreateStreamInfo): Promise<TransactionBlock>;
}

export interface IMPayHelper {
  getBalance(address: string, coinType?: string | null): Promise<CoinBalance>;
  getAllBalance(address: string): Promise<CoinBalance[]>;

  getStreamIdsFromCreateStreamResponse(res: SuiTransactionBlockResponse): string[];
  calculateStreamAmount(input: { totalAmount: bigint; steps: bigint; cliff?: Fraction }): CalculatedStreamAmount;
  calculateTimelineByInterval(input: { timeStart: DateTime; interval: Duration; steps: bigint }): CalculatedTimeline;
  calculateTimelineByTotalDuration(input: { timeStart: DateTime; total: Duration; steps: bigint }): CalculatedTimeline;
}

export type IPagedStreamListIterator = SuiIterator<(IStream | IStreamGroup)[]>;

export interface IncomingStreamQuery {
  status?: StreamStatus | StreamStatus[];
  sender?: string | string[];
  coinType?: string | string[];
}

export interface OutgoingStreamQuery {
  status?: StreamStatus | StreamStatus[];
  recipient?: string | string[];
  coinType?: string | string[];
}

export interface CreateStreamInfo {
  name: string;
  coinType: string;
  recipients: RecipientWithAmount[];
  interval: bigint; // Interval in milliseconds
  steps: bigint;
  startTimeMs: bigint;
  cliffAmount: bigint;
  cancelable: boolean;
}

export interface RecipientWithAmount {
  address: string;
  amountPerStep: bigint;
  cliffAmount: bigint;
}

export interface CreateStreamInfoInternal {
  metadata: string;
  coinType: string;
  recipients: RecipientInfoInternal[];
  epochInterval: bigint;
  numberEpoch: bigint;
  startTime: bigint;
  cancelable: boolean;
}

export interface RecipientInfoInternal {
  address: string;
  cliffAmount: bigint;
  amountPerEpoch: bigint;
}

export interface CalculatedStreamAmount {
  realTotalAmount: bigint;
  cliffAmount: bigint;
  amountPerStep: bigint;
}

export interface CalculatedTimeline {
  timeStart: DateTime;
  timeEnd: DateTime;
  interval: Duration;
  steps: bigint;
}

export interface Fraction {
  numerator: bigint;
  denominator: bigint;
}
