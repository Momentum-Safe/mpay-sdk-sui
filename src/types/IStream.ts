// Stream have 5 status, three status for normal status, and two status for canceled status.
//   streaming: !canceled && streamed != 100
//   streamed: !canceled && streamed === 100 && claimable !== 0
//   completed: !canceled && streamed === 100 && claimable === 0
//   canceled: canceled && claimable !== 0
//   settled: canceled && claimable === 0
import { SuiTransactionBlockResponse } from '@mysten/sui.js/client';
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
  cancel(): Promise<string | SuiTransactionBlockResponse>;

  // Recipient
  claim(): Promise<string | SuiTransactionBlockResponse>;
  setAutoClaim(enabled: boolean): Promise<string | SuiTransactionBlockResponse>;

  // Third party
  claimByProxy(): Promise<string | SuiTransactionBlockResponse>;
}

export interface IStreamGroup {
  groupId: string;
  streams: IStream[];
  sender: string;

  info(): Promise<StreamGroupInfo>;
  historyEvents(options?: PaginationOptions): Promise<Paginated<StreamEvent[]>>;
}

export type StreamInfo = StreamInfoCommon & {
  groupId: string;
  streamId: string;
  progress: StreamProgress;
};

export type StreamGroupInfo = StreamInfoCommon & {
  groupId: string;
  progress: StreamProgress;
  streamIds: string[];
  streams: IStream[];
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
  duration: Duration; // In seconds
  interval: Duration; // Interval in seconds
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

export interface StreamMetadata {
  groupId: string;
  name: string;
}
