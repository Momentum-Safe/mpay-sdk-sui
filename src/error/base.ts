export enum MPayErrorCode {
  sanity,
  walletNotConnected,
}

export type JsonObject =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | readonly JsonObject[]
  | { readonly [key: string]: JsonObject }
  | { toJSON(): JsonObject };

export class MPayError extends Error {
  public readonly mpayErrorCode: number;

  public readonly context?: JsonObject;

  constructor(mpayErrorCode: number, msg: string, options: { cause?: unknown; context?: JsonObject } = {}) {
    const { cause, context } = options;
    if (cause) {
      super(`[Maven] ${msg}: ${cause}`, { cause });
    } else {
      super(`[Maven] ${msg}`);
    }
    this.mpayErrorCode = mpayErrorCode;
    this.context = context;
  }
}
