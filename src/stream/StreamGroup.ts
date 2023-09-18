import { InvalidInputError } from '@/error/InvalidInputError';
import { Stream } from '@/stream/Stream';

export class StreamGroup {
  constructor(public readonly streams: Stream[]) {
    const gids = streams.map((st) => st.groupId);
    const set = new Set(gids);
    if (set.size !== 1) {
      throw new InvalidInputError('Stream does not have same group ID');
    }
  }

  static newFromIds(ids: string[]) {
    const streamsObj =
  }
}
