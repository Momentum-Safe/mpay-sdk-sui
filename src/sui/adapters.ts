import type { SuiClientTypes } from '@mysten/sui/client';
import { pureBcsSchemaFromTypeName } from '@mysten/sui/bcs';
import { normalizeSuiAddress } from '@mysten/sui/utils';

import { TransactionFailedError } from '@/error/TransactionFailedError';
import type { MPaySuiClient, SimulateTransactionResult } from '@/sui/client';

/** Legacy object shape used by stream parsing and iterators. */
export interface MPayObjectResponse {
  data?: {
    objectId: string;
    content?: {
      dataType: 'moveObject';
      type: string;
      fields: Record<string, unknown>;
    };
  };
  error?: {
    code: string;
  };
}

export interface MPayCoinStruct {
  coinType: string;
  coinObjectId: string;
  version: string;
  digest: string;
  balance: string;
}

export function toMpayCoin(coin: SuiClientTypes.Coin): MPayCoinStruct {
  return {
    coinType: coin.type,
    coinObjectId: coin.objectId,
    version: coin.version,
    digest: coin.digest,
    balance: coin.balance,
  };
}

export function toMpayObject(object: SuiClientTypes.Object<{ json: true }>): MPayObjectResponse {
  const json = object.json;
  if (!json || typeof json !== 'object') {
    return {
      data: {
        objectId: object.objectId,
      },
    };
  }

  return {
    data: {
      objectId: object.objectId,
      content: {
        dataType: 'moveObject',
        type: object.type,
        fields: normalizeMoveObjectJson(json as Record<string, unknown>),
      },
    },
  };
}

/** Normalize gRPC / JSON-RPC Move object JSON into the legacy `{ fields: ... }` shape. */
function normalizeMoveObjectJson(json: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(json)) {
    normalized[key] = normalizeMoveJsonValue(value);
  }
  return normalized;
}

function normalizeMoveJsonValue(value: unknown): unknown {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  const record = value as Record<string, unknown>;
  if ('fields' in record && record.fields && typeof record.fields === 'object') {
    return { fields: normalizeMoveObjectJson(record.fields as Record<string, unknown>) };
  }
  return { fields: normalizeMoveObjectJson(record) };
}

export function readMoveU64(value: unknown): bigint {
  if (value == null) {
    throw new Error('Missing Move u64 value');
  }
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return BigInt(value);
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('fields' in record) {
      return readMoveU64(record.fields);
    }
    if ('balance' in record) {
      return readMoveU64(record.balance);
    }
    if ('value' in record) {
      return readMoveU64(record.value);
    }
  }
  throw new Error(`Unsupported Move u64 value: ${JSON.stringify(value)}`);
}

export function unwrapMoveFields(value: unknown): Record<string, unknown> {
  if (value == null || typeof value !== 'object') {
    return {};
  }
  const record = value as Record<string, unknown>;
  if ('fields' in record && record.fields && typeof record.fields === 'object') {
    return record.fields as Record<string, unknown>;
  }
  return record;
}

export function toMpayObjectError(error: unknown): MPayObjectResponse {
  const message = error instanceof Error ? error.message : String(error);
  const code = /not found|not exist|unknown object/i.test(message) ? 'notExists' : 'unknown';
  return { error: { code } };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getMpayObject(client: MPaySuiClient, objectId: string): Promise<MPayObjectResponse> {
  const retryDelaysMs = [0, 400, 800, 1600];

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
    if (retryDelaysMs[attempt] > 0) {
      await sleep(retryDelaysMs[attempt]);
    }
    try {
      const { object } = await client.getObject({
        objectId,
        include: { json: true },
      });
      const res = toMpayObject(object);
      if (!res.error && res.data?.content) {
        return res;
      }
      if (res.error?.code !== 'notExists' || attempt === retryDelaysMs.length - 1) {
        return res;
      }
    } catch (error) {
      const res = toMpayObjectError(error);
      if (res.error?.code !== 'notExists' || attempt === retryDelaysMs.length - 1) {
        return res;
      }
    }
  }

  return { error: { code: 'notExists' } };
}

export async function getMpayObjects(client: MPaySuiClient, objectIds: string[]): Promise<MPayObjectResponse[]> {
  const { objects } = await client.getObjects({
    objectIds,
    include: { json: true },
  });
  return objects.map((entry) => {
    if (entry instanceof Error) {
      return toMpayObjectError(entry);
    }
    return toMpayObject(entry);
  });
}

export type TransactionResultWithEffects = SuiClientTypes.TransactionResult<{
  effects: true;
  objectTypes: true;
}>;

export function isSuccessfulTransaction(result: TransactionResultWithEffects): boolean {
  const tx = result.Transaction ?? result.FailedTransaction;
  return tx?.effects?.status.success === true;
}

export function getCreatedObjectIdsFromTransaction(
  result: TransactionResultWithEffects,
  objectTypePrefix: string,
): string[] {
  const tx = result.Transaction ?? result.FailedTransaction;
  if (!tx?.effects?.status.success) {
    const error = tx?.effects?.status.error;
    throw new TransactionFailedError(undefined, error?.message ?? 'Transaction failed');
  }

  const objectTypes = tx.objectTypes ?? {};
  return (tx.effects?.changedObjects ?? [])
    .filter((change) => change.idOperation === 'Created')
    .filter((change) => {
      const type = objectTypes[change.objectId];
      return type?.includes('::stream::Stream');
    })
    .map((change) => change.objectId);
}

export function decodeSimulatedU64(result: SimulateTransactionResult, callIndex = 0, returnIndex = 0): bigint {
  const commandResults = result.commandResults;
  if (!commandResults?.[callIndex]?.returnValues?.[returnIndex]) {
    throw new Error('Missing simulated return value');
  }
  const bytes = commandResults[callIndex].returnValues[returnIndex].bcs;
  const u64 = pureBcsSchemaFromTypeName('u64');
  return BigInt(u64.parse(bytes));
}

export function decodeSimulatedAddress(result: SimulateTransactionResult, callIndex = 0, returnIndex = 0): string {
  const commandResults = result.commandResults;
  if (!commandResults?.[callIndex]?.returnValues?.[returnIndex]) {
    throw new Error('Missing simulated return value');
  }
  const bytes = commandResults[callIndex].returnValues[returnIndex].bcs;
  const address = pureBcsSchemaFromTypeName('address');
  return normalizeSuiAddress(String(address.parse(bytes)));
}
