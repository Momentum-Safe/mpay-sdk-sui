import { MPayError, MPayErrorCode } from '@/error/base';

export class NotCreatorError extends MPayError {
  constructor() {
    super(MPayErrorCode.NotCreator, 'Connected wallet is not creator');
  }
}
