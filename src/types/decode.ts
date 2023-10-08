import { CreateStreamInfo, PaymentWithFee } from '@/types/client';
import { StreamInfo } from '@/types/stream';

export type StreamDecodedTransaction =
  | DecodedCreateStream
  | DecodedSetAutoClaim
  | DecodedClaimStream
  | DecodedCancelStream
  | DecodedClaimByProxy
  | undefined;

export enum StreamTransactionType {
  CREATE_STREAM = 'CreateStream',
  SET_AUTO_CLAIM = 'SetAutoClaim',
  CLAIM = 'Claim',
  CLAIM_BY_PROXY = 'ClaimByProxy',
  CANCEL = 'Cancel',
}

export interface DecodedCreateStream {
  type: StreamTransactionType.CREATE_STREAM;

  info: CreateStreamInfo;
  fees: PaymentWithFee;
  coinMerges: CoinMerge[];
}

export interface CoinMerge {
  coinType: string;
  primary: string | 'GAS';
  merged?: string[];
}

export interface DecodedSetAutoClaim {
  type: StreamTransactionType.SET_AUTO_CLAIM;

  streamInfo: StreamInfo;
  enabled: boolean;
}

export interface DecodedClaimStream {
  type: StreamTransactionType.CLAIM;

  streamInfo: StreamInfo;
}

export interface DecodedClaimByProxy {
  type: StreamTransactionType.CLAIM_BY_PROXY;

  streamInfo: StreamInfo;
}

export interface DecodedCancelStream {
  type: StreamTransactionType.CANCEL;

  streamInfo: StreamInfo;
}
