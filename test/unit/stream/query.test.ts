import { DateTime, Duration } from 'luxon';

import { Globals } from '@/common';
import { Stream } from '@/stream';
import { convertStreamStatus, groupAndSortRefs, PagedStreamListIterator, StreamListIterator } from '@/stream/query';
import { IStream, IStreamGroup, StreamStatus } from '@/types';
import { StreamRef } from '@/types/backend';
import { SingleWalletAdapter } from '@/wallet';

import { MockBackend } from '../../lib/backend';
import { getTestSuite, newUnitGlobals } from '../../lib/setup';
import { createCanceledStream, createSettledStream, createStreamForTest, createStreamGroup } from '../../lib/stream';
import { FakeWallet } from '../../lib/wallet';

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

  // The following streams are generated with the following code:

  const recipient = '0xb924811f0b632a013389ce4038ba8fe565f3cef006df9d960ff3b163e2c08543';
  const sender = recipient;
  const streaming = ['0x4affad33481baa99c78a211b6d84dd27c2719b3b488f8d45662def015e580715'];
  const group = [
    '0x9546e45576d733bb102532cd04eb872a937bd1d83cef5df5f8731b507281555f',
    '0xd1acad4d1abc7989672709c2bf397893d80f8710a2336423696c049294fc4e81',
  ];
  const canceled = ['0xb60a7c54c94e8ca61d5217764bf5a4b35b3d2f79341a5d25e3df706dec233b0a'];
  const settled = ['0xb6e01885a49f3c8d2fb7be24d18e3233a65e482c6e1ed2d8d542ef5efb210ebc'];

  beforeAll(async () => {
    // const res = await setupStreamsAndBackend();
    globals = newUnitGlobals();
    // const res = await setupStreamsAndBackend();

    // console.log(res);
    // console.log(res.ts.address);
    // console.log(res.streaming.streamId);
    // console.log(res.group.streams.map((stream) => stream.streamId));
    // console.log(res.canceled.streamId);
    // console.log(res.settled.streamId);
    globals.connectWallet(new SingleWalletAdapter(new FakeWallet(recipient), globals.suiClient));
  });

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
        sender: [sender],
      },
    });
    await testStreamListIteration(it, [streaming, group, canceled, settled]);
  });
});

async function setupStreamsAndBackend() {
  const ts = await getTestSuite();

  const streaming = await createStreamForTest(ts, ts.address);
  const group = await createStreamGroup(ts, [ts.address, ts.address]);
  const canceled = await createCanceledStream(ts, ts.address);
  const settled = await createSettledStream(ts, ts.address);
  // const streams = [streaming, ...group.streams, canceled, settled];
  // const mockBackend = createMockBackend(streams);
  // ts.globals.backend = mockBackend;
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
      .toISODate() as string,
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
