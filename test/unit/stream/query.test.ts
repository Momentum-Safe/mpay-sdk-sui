import { DateTime, Duration } from 'luxon';

import { Stream } from '@/stream';
import { convertStreamStatus, groupAndSortRefs, PagedStreamListIterator, StreamListIterator } from '@/stream/query';
import { IStream, IStreamGroup, StreamStatus } from '@/types';
import { StreamRef } from '@/types/backend';

import { MockBackend } from '../../lib/backend';
import { getTestSuite, TestSuite } from '../../lib/setup';
import { createCanceledStream, createSettledStream, createStreamForTest, createStreamGroup } from '../../lib/stream';

const TEST_REFS: StreamRef[] = [
  {
    groupID: '1695018413554',
    streamID: '0x7b0891696e42568f9bdb3fccb2a973f4c07c6553c3878e1be1af52320f8ce535',
    sender: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    recipient: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    coinType: '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    createDate: '2023-09-18T06:26:59.000Z',
  },
  {
    groupID: '1695018413554',
    streamID: '0x08a749a7049669cf89b4bb7d7ecdf9a6210d253a65ccf127f507316074b612a5',
    sender: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    recipient: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    coinType: '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    createDate: '2023-09-18T06:26:59.000Z',
  },
  {
    groupID: '1695018413553',
    streamID: '0x08a749a7049669cf89b4bb7d7ecdf9a6210d253a65ccf127f507316074b612a5',
    sender: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    recipient: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    coinType: '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    createDate: '2023-09-17T06:26:59.000Z',
  },
];

describe('groupAndSortRefs', () => {
  it('test group', () => {
    const res = groupAndSortRefs(TEST_REFS);
    expect(res.length).toBe(2);

    res.forEach((groupList) => {
      expect(new Set(groupList.map((st) => st.groupID)).size).toBe(1);
    });

    const date1 = DateTime.fromISO(res[0][0].createDate);
    const date2 = DateTime.fromISO(res[1][0].createDate);
    expect(date1.toMillis()).toBeGreaterThan(date2.toMillis());
  });
});

describe('convertStreamStatus', () => {
  it('simple', () => {
    expect(convertStreamStatus(undefined)).toBe('all');
    expect(convertStreamStatus([])).toBe('all');
    expect(convertStreamStatus(StreamStatus.CANCELED)).toBe('active');
    expect(convertStreamStatus(StreamStatus.STREAMING)).toBe('active');
    expect(convertStreamStatus(StreamStatus.STREAMED)).toBe('active');
    expect(convertStreamStatus(StreamStatus.COMPLETED)).toBe('inactive');
    expect(convertStreamStatus(StreamStatus.SETTLED)).toBe('inactive');
  });

  it('complex', () => {
    expect(convertStreamStatus([StreamStatus.CANCELED, StreamStatus.STREAMING, StreamStatus.STREAMED])).toBe('active');
    expect(convertStreamStatus([StreamStatus.COMPLETED, StreamStatus.SETTLED])).toBe('inactive');
    expect(convertStreamStatus([StreamStatus.SETTLED, StreamStatus.STREAMED])).toBe('all');
  });
});

describe('StreamListIterator', () => {
  let ts: TestSuite;
  let streaming: string[];
  let group: string[];
  let canceled: string[];
  let settled: string[];

  beforeAll(async () => {
    const res = await setupStreamsAndBackend();
    ts = res.ts;
    streaming = [res.streaming.streamId];
    group = res.group.streams.map((stream) => stream.streamId);
    canceled = [res.canceled.streamId];
    settled = [res.settled.streamId];
  });

  it('no filter', async () => {
    const it = await StreamListIterator.newIncoming({
      globals: ts.globals,
    });
    await testStreamListIteration(it, [streaming, group, canceled, settled]);
  });

  it('filter: streaming', async () => {
    const it = await StreamListIterator.newIncoming({
      globals: ts.globals,
      query: {
        status: StreamStatus.STREAMING,
      },
    });
    await testStreamListIteration(it, [streaming, group]);
  });

  it('filter: canceled', async () => {
    const it = await StreamListIterator.newIncoming({
      globals: ts.globals,
      query: {
        status: StreamStatus.CANCELED,
      },
    });
    await testStreamListIteration(it, [group, canceled]);
  });

  it('filter: settled', async () => {
    const it = await StreamListIterator.newIncoming({
      globals: ts.globals,
      query: {
        status: StreamStatus.SETTLED,
      },
    });
    await testStreamListIteration(it, [settled]);
  });

  it('filter: settled & streaming', async () => {
    const it = await StreamListIterator.newIncoming({
      globals: ts.globals,
      query: {
        status: [StreamStatus.SETTLED, StreamStatus.CANCELED],
      },
    });
    await testStreamListIteration(it, [group, canceled, settled]);
  });

  it('Paged: page size 1', async () => {
    const it = await PagedStreamListIterator.newIncoming({
      globals: ts.globals,
      pageSize: 1,
    });
    await testPagedStreamListIteration(it, [1, 1, 1, 1]);
  });

  it('Paged: page size 2', async () => {
    const it = await PagedStreamListIterator.newIncoming({
      globals: ts.globals,
      pageSize: 2,
    });
    await testPagedStreamListIteration(it, [2, 2]);
  });

  it('Paged: page size 3', async () => {
    const it = await PagedStreamListIterator.newIncoming({
      globals: ts.globals,
      pageSize: 3,
    });
    await testPagedStreamListIteration(it, [3, 1]);
  });

  it('Paged: page size 4', async () => {
    const it = await PagedStreamListIterator.newIncoming({
      globals: ts.globals,
      pageSize: 4,
    });
    await testPagedStreamListIteration(it, [4]);
  });

  it('Paged: page size 5', async () => {
    const it = await PagedStreamListIterator.newIncoming({
      globals: ts.globals,
      pageSize: 5,
    });
    await testPagedStreamListIteration(it, [4]);
  });
});

async function setupStreamsAndBackend() {
  const ts = await getTestSuite();

  const streaming = await createStreamForTest(ts, ts.address);
  const group = await createStreamGroup(ts, [ts.address, ts.address]);
  const canceled = await createCanceledStream(ts, ts.address);
  const settled = await createSettledStream(ts, ts.address);

  const streams = [streaming, ...group.streams, canceled, settled];
  const mockBackend = createMockBackend(streams);
  ts.globals.backend = mockBackend;
  return {
    ts,
    streaming,
    group,
    canceled,
    settled,
  };
}

function createMockBackend(streams: Stream[]) {
  const be = new MockBackend();
  const refs = streams.map((stream, i) => ({
    groupID: stream.groupId,
    streamID: stream.streamId,
    sender: stream.creator,
    recipient: stream.recipient,
    coinType: stream.coinType,
    createDate: DateTime.now()
      .minus(Duration.fromMillis(i * 10000))
      .toISODate() as string,
  }));
  be.addStreamRef(...refs);
  return be;
}

async function testStreamListIteration(it: StreamListIterator, streamIds: string[][]) {
  for (let i = 0; i !== streamIds.length; i++) {
    expect(await it.hasNext()).toBeTruthy();
    const st = await it.next();
    expect(st).toBeDefined();
    if (streamIds[i].length === 1) {
      expect('streamId' in (st as IStream | IStreamGroup)).toBeTruthy();
      expect((st as Stream).streamId).toBe(streamIds[i][0]);
    } else {
      expect('streams' in (st as IStream | IStreamGroup)).toBeTruthy();
      const { streams } = st as IStreamGroup;
      expect(streams.length).toBe(streamIds[i].length);
      for (let j = 0; j !== streams.length; j++) {
        const stream = streams[j];
        expect(stream.streamId).toBe(streamIds[i][j]);
      }
    }
  }
  expect(await it.hasNext()).toBeFalsy();
}

async function testPagedStreamListIteration(it: PagedStreamListIterator, pagedNumber: number[]) {
  for (let i = 0; i !== pagedNumber.length; i++) {
    expect(await it.hasNext()).toBeTruthy();
    const sts = await it.next();
    expect(sts).toBeDefined();
    expect(sts.length).toBe(pagedNumber[i]);
  }
  expect(await it.hasNext()).toBeFalsy();
}
