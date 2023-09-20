import { JsonObject, MPayError, MPayErrorCode } from '@/error/base';

export class InvalidStreamGroupError extends MPayError {
  constructor(msg: string, context?: JsonObject) {
    super(MPayErrorCode.InvalidStreamGroup, `Invalid stream group: ${msg}`, { context });
  }
}
