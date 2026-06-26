import { DateTime, Duration } from 'luxon';

import { Globals } from '@/common';
import { Stream, StreamGroup } from '@/stream';
import { convertStreamStatus, groupAndSortRefs, PagedStreamListIterator, StreamListIterator } from '@/stream/query';
import { IStream, IStreamGroup, StreamStatus } from '@/types';
import { StreamRef } from '@/types/backend';

import { MockBackend } from '../../lib/backend';
import { getCanceledStream, getChainFixtures, getSettledStream } from '../../lib/chain-fixtures';

const TEST_REFS: StreamRef[] = [
  {
    groupId: '1695018413554',
    streamId: '0x7b0891696e42568f9bdb3fccb2a973f4c07c6553c3878e1be1af52320f8ce535',
    sender: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    recipient: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    coinType: '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    createDate: '2023-09-18T06:26:59.000Z',
  },
  {
    groupId: '1695018413554',
    streamId: '0x08a749a7049669cf89b4bb7d7ecdf9a6210d253a65ccf127f507316074b612a5',
    sender: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    recipient: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    coinType: '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    createDate: '2023-09-18T06:26:59.000Z',
  },
  {
    groupId: '1695018413553',
    streamId: '0x08a749a7049669cf89b4bb7d7ecdf9a6210d253a65ccf127f507316074b612a5',
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
      expect(new Set(groupList.map((st) => st.groupId)).size).toBe(1);
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
    expect(convertStreamStatus(StreamStatus.COMPLETED)).toBe('inactive');
    expect(convertStreamStatus(StreamStatus.SETTLED)).toBe('inactive');
  });

  it('complex', () => {
    expect(convertStreamStatus([StreamStatus.CANCELED, StreamStatus.STREAMING])).toBe('active');
    expect(convertStreamStatus([StreamStatus.COMPLETED, StreamStatus.SETTLED])).toBe('inactive');
    expect(convertStreamStatus([StreamStatus.SETTLED, StreamStatus.STREAMING])).toBe('all');
  });
});

describe('StreamListIterator', () => {
  let globals: Globals;
  let recipient: string;
  let streaming: string[];
  let group: string[];
  let canceled: string[];
  let settled: string[];

  beforeAll(async () => {
    const res = await setupStreamsAndBackend();
    globals = res.ts.globals;
    recipient = res.ts.address;
    streaming = [res.streaming.streamId];
    group = res.group.streams.map((stream: Stream) => stream.streamId);
    canceled = [res.canceled.streamId];
    settled = [res.settled.streamId];
  }, 300_000);

  it('no filter', async () => {
    const it = await StreamListIterator.newIncoming({
      globals,
    });
    await testStreamListIteration(it, [streaming, group, canceled, settled]);
  });

  it('filter: streaming', async () => {
    const it = await StreamListIterator.newIncoming({
      globals,
      query: {
        status: StreamStatus.STREAMING,
      },
    });
    await testStreamListIteration(it, [streaming, group]);
  });

  it('filter: canceled', async () => {
    const it = await StreamListIterator.newIncoming({
      globals,
      query: {
        status: StreamStatus.CANCELED,
      },
    });
    await testStreamListIteration(it, [group, canceled]);
  });

  it('filter: settled', async () => {
    const it = await StreamListIterator.newIncoming({
      globals,
      query: {
        status: StreamStatus.SETTLED,
      },
    });
    await testStreamListIteration(it, [settled]);
  });

  it('filter: settled & streaming', async () => {
    const it = await StreamListIterator.newIncoming({
      globals,
      query: {
        status: [StreamStatus.SETTLED, StreamStatus.CANCELED],
      },
    });
    await testStreamListIteration(it, [group, canceled, settled]);
  });

  it('Paged: page size 1', async () => {
    const it = await PagedStreamListIterator.newIncoming({
      globals,
      pageSize: 1,
    });
    await testPagedStreamListIteration(it, [1, 1, 1, 1]);
  });

  it('Paged: page size 2', async () => {
    const it = await PagedStreamListIterator.newIncoming({
      globals,
      pageSize: 2,
    });
    await testPagedStreamListIteration(it, [2, 2]);
  });

  it('Paged: page size 3', async () => {
    const it = await PagedStreamListIterator.newIncoming({
      globals,
      pageSize: 3,
    });
    await testPagedStreamListIteration(it, [3, 1]);
  });

  it('Paged: page size 4', async () => {
    const it = await PagedStreamListIterator.newIncoming({
      globals,
      pageSize: 4,
    });
    await testPagedStreamListIteration(it, [4]);
  });

  it('Paged: page size 5', async () => {
    const it = await PagedStreamListIterator.newIncoming({
      globals,
      pageSize: 5,
    });
    await testPagedStreamListIteration(it, [4]);
  });

  it('claimable', async () => {
    const it = await StreamListIterator.newIncoming({
      globals,
      query: {
        claimable: true,
      },
    });
    await testStreamListIteration(it, [streaming, group, canceled]);
  });

  it('not claimable', async () => {
    const it = await StreamListIterator.newIncoming({
      globals,
      query: {
        claimable: false,
      },
    });
    await testStreamListIteration(it, [settled]);
  });

  it('list of coin types', async () => {
    const it = await StreamListIterator.newIncoming({
      globals,
      query: {
        coinType: ['0x2::sui::SUI'],
      },
    });
    await testStreamListIteration(it, [streaming, group, canceled, settled]);
  });

  it('list of sender', async () => {
    const it = await StreamListIterator.newIncoming({
      globals,
      query: {
        sender: [recipient],
      },
    });
    await testStreamListIteration(it, [streaming, group, canceled, settled]);
  });
});

async function setupStreamsAndBackend() {
  const { ts, fixtures } = await getChainFixtures();
  console.log('[test] query.setup: loading shared chain fixtures...');
  const streaming = await Stream.new(ts.globals, fixtures.activeStreamId);
  const group = await StreamGroup.new(ts.globals, fixtures.groupStreamIds);
  const { stream: canceled } = await getCanceledStream();
  const { stream: settled } = await getSettledStream();
  const streams = [streaming, ...group.streams, canceled, settled];
  ts.globals.backend = createMockBackend(streams);
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
    groupId: stream.groupId,
    streamId: stream.streamId,
    sender: stream.creator,
    recipient: stream.recipient,
    coinType: stream.coinType,
    createDate: DateTime.now()
      .minus(Duration.fromMillis(i * 10000))
      .toISO() as string,
  }));
  be.addStreamRef(...refs);
  return be;
}

async function testStreamListIteration(it: StreamListIterator, streamIds: string[][]) {
  const res: (IStreamGroup | IStream)[] = [];
  while (await it.hasNext()) {
    res.push(await it.next());
  }
  expect(res.length).toBe(streamIds.length);

  for (let i = 0; i !== streamIds.length; i++) {
    const exp = streamIds[i];
    if (exp.length === 1) {
      const st = res.find((stream) => stream.type === 'Stream' && stream.streamId === exp[0]);
      expect(st).toBeDefined();
    } else {
      const sg = res.find(
        (s) => s.type === 'StreamGroup' && (s.streams[0].streamId === exp[0] || s.streams[1].streamId === exp[0]),
      );
      expect(sg).toBeDefined();
    }
  }
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
