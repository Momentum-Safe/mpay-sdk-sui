import { JsonObject, MPayError, MPayErrorCode } from '@/error/base';

export class InvalidRpcResultError extends MPayError {
  constructor(msg: string, ctx?: JsonObject) {
    super(MPayErrorCode.InvalidRpcResult, msg, { context: ctx });
  }
}
