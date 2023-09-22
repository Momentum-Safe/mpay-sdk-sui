import { SuiObjectResponse } from '@mysten/sui.js/client';
import { DateTime } from 'luxon';

import { Globals } from '@/common/globals';
import { InvalidInputError } from '@/error/InvalidInputError';
import { SanityError } from '@/error/SanityError';
import { Stream } from '@/stream/Stream';
import { StreamGroup } from '@/stream/StreamGroup';
import { EntryIterator } from '@/sui/iterator/iterator';
import { ListOidIterator, ObjectBatchIterator } from '@/sui/iterator/object';
import { PagedData, Requester } from '@/sui/iterator/requester';
import {
  BackendIncomingStreamFilterOptions,
  BackendOutgoingStreamFilterOptions,
  StreamFilterStatus,
  StreamRef,
} from '@/types/backend';
import { IncomingStreamQuery, OutgoingStreamQuery } from '@/types/client';
import { IStream, IStreamGroup, StreamStatus } from '@/types/IStream';

export const STREAM_LIST_PAGE_SIZE = 10;

export class StreamListIterator implements EntryIterator<IStream | IStreamGroup> extends EntryIterator {

}

export class IncomingStreamRequester implements Requester<IStream | IStreamGroup> {
  public current = 0;

  public objectIter: ObjectBatchIterator;

  private constructor(
    public readonly globals: Globals,
    public readonly recipient: string,
    public readonly groupRefs: StreamRef[][],
    public readonly query?: IncomingStreamQuery | OutgoingStreamQuery,
  ) {
    this.current = 0;
    const oidIter = new ListOidIterator(groupRefs.flat().map((ref) => ref.streamID));
    this.objectIter = new ObjectBatchIterator(globals.suiClient, oidIter);
  }

  static async new(input: { globals: Globals; query?: IncomingStreamQuery | OutgoingStreamQuery }) {
    const backendQuery = convertToIncomingBackendQuery(input.query);
    const recipient = await input.globals.walletAddress();
    const refs = await input.globals.backend.getIncomingStreams(await input.globals.walletAddress(), backendQuery);
    const groupedRefs = groupAndSortRefs(refs);
    return new IncomingStreamRequester(input.globals, recipient, groupedRefs, input.query);
  }

  async doNextRequest(): Promise<PagedData<IStream | IStreamGroup>> {
    if (this.current === this.groupRefs.length) {
      return {
        data: [],
        hasNext: false,
      };
    }
    const stRefs = this.groupRefs[this.current];
    if (stRefs.length === 1) {
      const stream = await getStreamFromIterator(this.globals, stRefs[0].streamID, this.objectIter);
      this.current++;

      return {
        data: isStreamOfStatus(stream, this.query?.status) ? [stream] : [],
        hasNext: this.current >= this.groupRefs.length,
      };
    }
    if (stRefs.length > 1) {
      const sg = await getStreamGroupFromIterator(
        this.globals,
        stRefs.map((ref) => ref.streamID),
        this.objectIter,
      );
      this.current++;

      return {
        data: isStreamGroupOfStatus(sg, this.query?.status) ? [sg] : [],
        hasNext: this.current >= this.groupRefs.length,
      };
    }
    throw new SanityError('Stream group with no stream');
  }
}

export function groupAndSortRefs(refs: StreamRef[]) {
  const m = new Map<string, StreamRef[]>();
  refs.forEach((ref) => {
    const groupList = m.get(ref.groupID);
    if (groupList) {
      groupList.push(ref);
      m.set(ref.groupID, groupList);
    } else {
      m.set(ref.groupID, [ref]);
    }
  });
  return Array.from(m.values()).sort(
    (gl1, gl2) => DateTime.fromISO(gl2[0].createDate).toMillis() - DateTime.fromISO(gl1[0].createDate).toMillis(),
  );
}

function isStreamOfStatus(stream: IStream, filter: StreamStatus | StreamStatus[] | undefined): boolean {
  if (filter === undefined) {
    return true;
  }
  if (!Array.isArray(filter)) {
    return stream.progress.status === filter;
  }
  return filter.includes(stream.progress.status);
}

function isStreamGroupOfStatus(sg: IStreamGroup, filter: StreamStatus | StreamStatus[] | undefined): boolean {
  let isStatus = false;
  sg.streams.forEach((stream) => {
    if (isStreamOfStatus(stream, filter)) {
      isStatus = true;
    }
  });
  return isStatus;
}

async function getStreamFromIterator(globals: Globals, streamId: string, it: ObjectBatchIterator) {
  const data = await getStreamObjectResponseFromIter(it, streamId);
  return Stream.fromObjectData(globals, streamId, data);
}

async function getStreamGroupFromIterator(globals: Globals, streamIds: string[], it: ObjectBatchIterator) {
  const objResponses: SuiObjectResponse[] = [];
  while (objResponses.length < streamIds.length) {
    const data = await getStreamObjectResponseFromIter(it, streamIds[objResponses.length]);
    objResponses.push(data);
  }
  return StreamGroup.newFromObjectResponse(globals, streamIds, objResponses);
}

async function getStreamObjectResponseFromIter(it: ObjectBatchIterator, streamId: string) {
  if (!(await it.hasNext())) {
    throw new SanityError('object iterator has been consumed');
  }
  const data = await it.next();
  if (!data || data.error || data.data === undefined || data.data === null) {
    throw new SanityError(`object iterator undefined response`, {
      cause: data?.error,
    });
  }
  if (data?.data?.objectId !== streamId) {
    throw new SanityError('stream id not aligned');
  }
  return data;
}

// Convert IncomingStreamQuery to BackendIncomingStreamFilterOptions
export function convertToIncomingBackendQuery(query?: IncomingStreamQuery): BackendIncomingStreamFilterOptions {
  return {
    status: convertStreamStatus(query?.status),
    coinType: query?.coinType,
    sender: query?.sender,
  };
}

export function convertToOutgoingBackendQuery(query?: OutgoingStreamQuery): BackendOutgoingStreamFilterOptions {
  return {
    status: convertStreamStatus(query?.status),
    coinType: query?.coinType,
    recipient: query?.recipient,
  };
}

function convertStreamStatus(status: undefined | StreamStatus | StreamStatus[]): StreamFilterStatus {
  if (status === undefined || status.length === 0) {
    return 'all';
  }
  if (!Array.isArray(status)) {
    return convertStreamStatusSingle(status);
  }
  return status.reduce((res, st) => {
    const sts = convertStreamStatus(st);
    if (res === 'none') {
      return sts;
    }
    if (res === sts) {
      return sts;
    }
    return 'all';
  }, 'none' as StreamFilterStatus);
}

function convertStreamStatusSingle(status: StreamStatus): StreamFilterStatus {
  switch (status) {
    case 'STREAMING':
    case 'STREAMED':
    case 'CANCELED':
      return 'active';
    case 'COMPLETED':
    case 'SETTLED':
      return 'inactive';
    default:
      throw new InvalidInputError('Unknown stream filtered status');
  }
}
