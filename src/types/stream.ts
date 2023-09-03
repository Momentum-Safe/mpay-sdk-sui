// Stream have 5 status, three status for normal status, and two status for canceled status.
//   streaming: !canceled && streamed != 100
//   streamed: !canceled && streamed === 100 && claimable !== 0
//   completed: !canceled && streamed === 100 && claimable === 0
//   canceled: canceled && claimable !== 0
//   settled: canceled && claimable === 0
import { SuiTransactionBlockResponse } from '@mysten/sui.js/client';

import { RawStreamData } from './contract';

import { StreamEvent } from '@/types/events';
import { Paginated, PaginationOptions } from '@/types/pagination';

export enum StreamStatus {
  streaming = 'streaming',
  streamed = 'streamed',
  completed = 'completed',
  canceled = 'canceled',
  settled = 'settled',
}

export interface Stream {
  streamID: string;
  groupID: string;
  sender: string;
  recipient: string;

  status(): Promise<StreamStatus>;
  info(): Promise<StreamInfo>;
  getRawData(): Promise<RawStreamData>;
  historyEvents(options?: PaginationOptions): Promise<Paginated<StreamEvent>>;

  // Sender
  cancelStream(): Promise<SuiTransactionBlockResponse>;

  // Recipient
  claim(): Promise<SuiTransactionBlockResponse>;
  setAutoClaim(enabled: boolean): Promise<SuiTransactionBlockResponse>;
}

export interface StreamGroup {
  groupID: string;
  streams: Stream[];
  sender: string;

  info(): Promise<StreamGroupInfo>;
  historyEvents(options?: PaginationOptions): Promise<Paginated<StreamEvent[]>>;
}

export type StreamInfo = StreamInfoCommon & {
  groupID: string;
  streamID: string;
  progress: StreamProgress;
};

export type StreamGroupInfo = StreamInfoCommon & {
  groupID: string;
  progress: StreamProgress;
  streamIDs: string[];
  streams: Stream[];
};

export interface StreamInfoCommon {
  name: string;
  sender: string;
  coinType: string;
  totalAmount: bigint;
  start: Date;
  end: Date;
  cancelable: boolean;
  cliffAmount: bigint;
  duration: number; // In seconds
  interval: number; // Interval in seconds
  steps: number;
  nextReleaseDate: Date;
  nextReleaseAmount: bigint;
}

export interface StreamProgress {
  status: StreamStatus;
  total: bigint;
  streamed: bigint;
  claimed: bigint;
  canceled: bigint;
}
