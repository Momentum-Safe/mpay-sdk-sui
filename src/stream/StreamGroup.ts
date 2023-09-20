import { Globals } from '@/common/globals';
import { InvalidInputError } from '@/error/InvalidInputError';
import { InvalidStreamGroupError } from '@/error/InvalidStreamGroupError';
import { Stream } from '@/stream/Stream';
import { getObjectsById } from '@/sui/iterator/object';
import { StreamEvent } from '@/types/events';
import { IStreamGroup, StreamGroupCommonInfo, StreamGroupInfo, StreamGroupProgress } from '@/types/IStream';
import { Paginated, PaginationOptions } from '@/types/pagination';

export class StreamGroup implements IStreamGroup {
  constructor(
    public readonly globals: Globals,
    public readonly streams: Stream[],
  ) {
    if (streams.length === 0) {
      throw new InvalidStreamGroupError('stream size 0');
    }
    const gids = streams.map((st) => st.groupId);
    const set = new Set(gids);
    if (set.size !== 1) {
      throw new InvalidInputError('Stream does not have same group ID');
    }
  }

  static async new(globals: Globals, ids: string[]) {
    const streamObjs = await getObjectsById(globals.suiClient, ids);
    const streams = streamObjs
      .map((obj, i) => {
        if (!obj) {
          console.warn(`Stream not found: ${ids[i]}`);
          return undefined;
        }
        return Stream.fromObjectData(globals, ids[i], obj);
      })
      .filter((stream) => !!stream) as Stream[];

    if (new Set(streams.map((st) => st.groupId)).size !== 1) {
      throw new InvalidStreamGroupError('Not same group ID');
    }
    if (!this.checkStreamGroup(streams)) {
      throw new InvalidStreamGroupError('Not same stream settings');
    }

    return new StreamGroup(globals, streams);
  }

  static checkStreamGroup(streams: Stream[]) {
    const commonInfos = streams.map((stream) => stream.groupCommonInfo);
    const expInfo = commonInfos[0];
    let isEqual = true;
    commonInfos.forEach((info) => {
      if (!isEqualStreamGroupCommonInfo(expInfo, info)) {
        isEqual = false;
      }
    });
    return isEqual;
  }

  get groupId() {
    return this.streams[0].groupId;
  }

  get creator() {
    return this.streams[0].creator;
  }

  get info(): StreamGroupInfo {
    return {
      groupId: this.groupId,
      streamIds: this.streams.map((st) => st.streamId),
      progress: this.progress,

      name: this.streams[0].name,
      creator: this.creator,
      coinType: this.streams[0].coinType,
      totalAmount: this.streams.reduce((sum, st) => sum + st.totalAmount, 0n),
      start: this.streams[0].timeStart,
      end: this.streams[0].timeEnd,
      cancelable: this.streams[0].cancelable,
      cliffAmount: this.streams.reduce((sum, st) => sum + st.cliff, 0n),
      duration: this.streams[0].duration,
      interval: this.streams[0].interval,
      steps: this.streams[0].totalSteps,
      nextReleaseAmount: this.streams.reduce((sum, st) => {
        if (st.nextReleaseAmount === null) {
          return sum;
        }
        return sum + st.nextReleaseAmount;
      }, 0n),
      nextReleaseDate: this.streams[0].nextReleaseDate,
    };
  }

  get progress(): StreamGroupProgress {
    return {
      total: this.streams.reduce((sum, st) => sum + st.totalAmount, 0n),
      streamed: this.streams.reduce((sum, st) => sum + st.streamedAmount, 0n),
      claimed: this.streams.reduce((sum, st) => sum + st.claimedAmount, 0n),
      claimable: this.streams.reduce((sum, st) => sum + st.claimable, 0n),
      canceled: this.streams.reduce((sum, st) => (st.isCanceled ? st.totalAmount - st.streamedAmount : 0n), 0n),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async historyEvents(options?: PaginationOptions): Promise<Paginated<StreamEvent[]>> {
    return {
      data: [],
      pageNumber: 0,
      pageSize: 0,
      totalSize: 0,
    };
  }
}

function isEqualStreamGroupCommonInfo(info1: StreamGroupCommonInfo, info2: StreamGroupCommonInfo): boolean {
  return (
    info1.name === info2.name &&
    info1.groupId === info2.groupId &&
    info1.creator === info2.creator &&
    info1.start.toMillis() === info2.start.toMillis() &&
    info1.interval.toMillis() === info2.interval.toMillis() &&
    info1.steps === info2.steps &&
    info1.cancelable === info2.cancelable
  );
}