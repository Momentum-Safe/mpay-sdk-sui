import { MPayError, MPayErrorCode } from '@/error/base';

export class InvalidInputError extends MPayError {
  constructor(msg: string, fieldKey?: string, fieldValue?: any) {
    super(MPayErrorCode.InvalidInput, `Invalid input: ${msg}`, {
      context: {
        fieldKey,
        fieldValue,
      },
    });
  }
}
