import { RawStreamConfig, RawStreamStatus } from '@/types/contract';
import { IStream } from '@/types/IStream';

export class Stream implements IStream {
  public readonly streamConfig: RawStreamConfig;

  public readonly streamStatus: RawStreamStatus;
}
