import { IStream, IStreamGroup, StreamStatus } from '@/types/IStream';
import { IMSafeAccount, ISingleWallet } from '@/types/wallet';

export interface IMPayClient {
  connectSingleWallet(wallet: ISingleWallet): void;
  connectMSafeAccount(msafe: IMSafeAccount): void;

  getStream(streamId: string): Promise<IStream>;
  getIncomingStreams(query?: IncomingStreamQuery): Promise<IStream[]>;
  getOutgoingStreams(query?: OutgoingStreamQuery): Promise<(IStream | IStreamGroup)[]>;

  createStream(info: CreateStreamInfo): Promise<string[] | undefined>;
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
  groupId: string;
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
