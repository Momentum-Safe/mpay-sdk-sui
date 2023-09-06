import { Stream, StreamGroup, StreamStatus } from '@/types/stream';
import { IMSafeAccount, ISingleWallet } from '@/types/wallet';

export interface MPayClient {
  connectSingleWallet(wallet: ISingleWallet): Promise<void>;
  connectMSafeAccount(wallet: IMSafeAccount): Promise<void>;

  getStream(streamID: string): Promise<Stream>;
  getIncomingStreams(query?: IncomingStreamQuery): Promise<Stream[]>;
  getOutgoingStreams(query?: OutgoingStreamQuery): Promise<(Stream | StreamGroup)[]>;

  createStream(info: CreateStreamInfo): Promise<Stream | StreamGroup>;
}

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
  recipients?: RecipientWithAmount[];
  interval: bigint; // Interval in milliseconds
  steps: bigint;
  startTime: Date;
  cliffAmount: bigint;
  cancelable: boolean;
}

export interface RecipientWithAmount {
  address: string;
  amount: bigint;
}
