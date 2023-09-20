import { MPayError, MPayErrorCode } from '@/error/base';

export class StreamNotFoundError extends MPayError {
  constructor(streamId: string) {
    super(MPayErrorCode.StreamNotFound, 'Stream not found', {
      context: {
        streamId,
      },
    });
  }
}
