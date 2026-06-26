import { InvalidStreamGroupError } from '@/error/InvalidStreamGroupError';
import { StreamGroup } from '@/stream/StreamGroup';
import { StreamStatus } from '@/types';

import { getChainFixtures, getGroupStreams } from '../../lib/chain-fixtures';
import { expectTransactionSuccess } from '../../lib/transaction';
import { sleep } from '../../lib/utils';

describe('StreamGroup', () => {
  let ts: Awaited<ReturnType<typeof getChainFixtures>>['ts'];
  let groupStreamIds: string[];
  let activeStreamId: string;

  beforeAll(async () => {
    const res = await getChainFixtures();
    ts = res.ts;
    groupStreamIds = res.fixtures.groupStreamIds;
    activeStreamId = res.fixtures.activeStreamId;
  });

  it('multiple streams', async () => {
    const sg = await StreamGroup.new(ts.globals, groupStreamIds);
    expect(sg.streams.length).toBe(2);
    expect(sg.progress.total).toBe(sg.streams.reduce((sum, st) => sum + st.totalAmount, 0n));
  });

  it('multiple streams with different group id shall throw error', async () => {
    await expect(StreamGroup.new(ts.globals, [...groupStreamIds, activeStreamId])).rejects.toThrow(
      InvalidStreamGroupError,
    );
  });

  it('refresh', async () => {
    const { group: sg } = await getGroupStreams();

    const txb = await sg.streams[0].cancel();
    const res = await ts.wallet.signAndSubmitTransaction(txb);
    expectTransactionSuccess(res);

    await sleep(1500);
    await sg.refresh();
    expect(sg.streams[0].progress.status).toBe(StreamStatus.CANCELED);
    expect(sg.streams[1].progress.status).toBe(StreamStatus.CANCELED);
    expect(sg.progress.canceled).toBeGreaterThan(0n);
  });
});
