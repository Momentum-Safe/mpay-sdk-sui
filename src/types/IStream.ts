// Stream have 5 status, three status for normal status, and two status for canceled status.
//   streaming: !canceled && streamed != 100
//   streamed: !canceled && streamed === 100 && claimable !== 0
//   completed: !canceled && streamed === 100 && claimable === 0
//   canceled: canceled && claimable !== 0
//   settled: canceled && claimable === 0
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { DateTime, Duration } from 'luxon';

import { StreamEvent } from '@/types/events';
import { Paginated, PaginationOptions } from '@/types/pagination';

export enum StreamStatus {
  STREAMING = 'STREAMING',
  STREAMED = 'STREAMED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  SETTLED = 'SETTLED',
}

export interface IStream {
  streamId: string;
  groupId: string;
  creator: string;
  recipient: string;
  progress: StreamProgress;
  info: StreamInfo;

  refresh(): Promise<void>;
  historyEvents(options?: PaginationOptions): Promise<Paginated<StreamEvent>>;

  // Sender
  cancel(): Promise<TransactionBlock>;

  // Recipient
  claim(): Promise<TransactionBlock>;
  setAutoClaim(enabled: boolean): Promise<TransactionBlock>;

  // Third party
  claimByProxy(): Promise<TransactionBlock>;
}

export interface IStreamGroup {
  groupId: string;
  streams: IStream[];
  creator: string;
  info: StreamGroupInfo;
  progress: StreamGroupProgress;

  refresh(): Promise<void>;
  historyEvents(options?: PaginationOptions): Promise<Paginated<StreamEvent[]>>;
}

export type StreamInfo = StreamInfoCommon & {
  groupId: string;
  streamId: string;
  progress: StreamProgress;
};

export type StreamGroupInfo = StreamInfoCommon & {
  groupId: string;
  streamIds: string[];
  progress: StreamGroupProgress;
};

export interface StreamInfoCommon {
  name: string;
  creator: string;
  coinType: string;
  totalAmount: bigint;
  start: DateTime;
  end: DateTime;
  cancelable: boolean;
  cliffAmount: bigint;
  duration: Duration;
  interval: Duration;
  steps: bigint;
  nextReleaseDate: DateTime | null;
  nextReleaseAmount: bigint | null;
}

// Common information for stream groups. Stream group requires the common info to be
// the same for all streams of a group.
export interface StreamGroupCommonInfo {
  name: string;
  groupId: string;
  creator: string;
  start: DateTime;
  interval: Duration;
  steps: bigint;
  cancelable: boolean;
}

export interface StreamProgress {
  status: StreamStatus;
  total: bigint;
  streamed: bigint;
  claimed: bigint;
  claimable: bigint;
  canceled: boolean;
}

export interface StreamGroupProgress {
  total: bigint;
  streamed: bigint;
  claimed: bigint;
  claimable: bigint;
  canceled: bigint;
}

export interface StreamMetadata {
  groupId: string;
  name: string;
}
