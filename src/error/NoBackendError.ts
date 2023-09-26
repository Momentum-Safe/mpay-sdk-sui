import { MPayError, MPayErrorCode } from '@/error/base';

export class NoBackendError extends MPayError {
  constructor() {
    super(MPayErrorCode.NoBackend, 'Backend is not specified');
  }
}
