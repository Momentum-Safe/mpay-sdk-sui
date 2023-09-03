// This file is only for internal use. Do no export this file.

export type U8 = number;
export type U64 = string;
export type Address = string;
export type ID = Address;

export enum RawStreamStatusEnum {
  OPEN = 0,
  CANCELED = 1,
  COMPLETED = 2,
}

export type RawStreamData = {
  config: RawStreamConfig;
  status: RawStreamStatus;
  coin: string;
  balance: bigint;
};

/// StreamConfig is the configuration of a streaming payment
/// It is immutable once created
export interface RawStreamConfig {
  metadata: string;
  creator: Address;
  receiver: Address;
  time_start: U64;
  cliff: U64;
  epoch_interval: U64;
  total_epoch: U64;
  amount_per_epoch: U64;
  cancelable: boolean;
}

/// StreamStatus is the status of a streaming payment
/// It will be updated when the stream is canceled or claimed
export interface RawStreamStatus {
  status: RawStreamStatusEnum;
  // if cliff is claimed
  cliff_claimed: boolean;
  // number of epoch that receiver has claimed
  epoch_claimed: U64;
  // number of epoch happened before stream is canceled
  epoch_canceled: U64;
}
