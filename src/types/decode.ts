import { CreateStreamInfo } from '@/types/client';
import { StreamInfo } from '@/types/stream';

export enum StreamTransactionType {
  CREATE_STREAM = 'CreateStream',
  SET_AUTO_CLAIM = 'SetAutoClaim',
  CLAIM = 'Claim',
  CLAIM_BY_PROXY = 'ClaimByProxy',
  CANCEL = 'Cancel',
}

export interface CreateStreamTransaction {
  type: StreamTransactionType.CREATE_STREAM;

  info: CreateStreamInfo;
}

export interface SetAutoClaimTransaction {
  type: StreamTransactionType.SET_AUTO_CLAIM;

  streamInfo: StreamInfo;
  enabled: boolean;
}

export interface ClaimStreamTransaction {
  type: StreamTransactionType.CLAIM;

  streamInfo: StreamInfo;
}

export interface ClaimByProxyTransaction {
  type: StreamTransactionType.CLAIM_BY_PROXY;

  streamInfo: StreamInfo;
}

export interface CancelStreamTransaction {
  type: StreamTransactionType.CANCEL;

  streamInfo: StreamInfo;
}
