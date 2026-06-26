import type { SuiClientTypes } from '@mysten/sui/client';
import { SuiGrpcClient } from '@mysten/sui/grpc';

import type { Env, SuiConfig } from '@/common/env';
import { getNetworkForEnv } from '@/common/env';

export type MPaySuiClient = SuiGrpcClient;

export type TransactionIncludeOptions = {
  effects: true;
  objectTypes: true;
  events: true;
};

export type { TransactionResultWithEffects } from '@/sui/adapters';

export type SimulateTransactionResult = SuiClientTypes.SimulateTransactionResult<{
  commandResults: true;
}>;

export function getGrpcBaseUrl(url: string): string {
  const normalized = url.replace(/\/$/, '');
  if (normalized.startsWith('https://') && !/:\d+$/.test(normalized)) {
    return `${normalized}:443`;
  }
  return normalized;
}

export function createSuiClient(env: Env, rpc: SuiConfig): MPaySuiClient {
  return new SuiGrpcClient({
    baseUrl: getGrpcBaseUrl(rpc.url),
    network: getNetworkForEnv(env),
  });
}

export function unwrapTransaction<Include extends SuiClientTypes.TransactionInclude>(
  result: SuiClientTypes.TransactionResult<Include>,
): SuiClientTypes.Transaction<Include> {
  return (result.Transaction ?? result.FailedTransaction)!;
}

export function unwrapSimulateTransaction<Include extends SuiClientTypes.SimulateTransactionInclude>(
  result: SuiClientTypes.SimulateTransactionResult<Include>,
): SuiClientTypes.Transaction<Include> {
  return (result.Transaction ?? result.FailedTransaction)!;
}
