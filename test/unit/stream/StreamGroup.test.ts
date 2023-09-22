import { InvalidStreamGroupError } from '@/error/InvalidStreamGroupError';
import { encodeMetadata } from '@/stream/metadata';
import { StreamGroup } from '@/stream/StreamGroup';
import { StreamStatus } from '@/types';
import { generateGroupId } from '@/utils/random';

import { getTestSuite, TestSuite } from '../../lib/setup';
import { createStreamHelper } from '../../lib/stream';

describe('StreamGroup', () => {
  let ts: TestSuite;

  beforeAll(async () => {
    ts = await getTestSuite();
  });

  it('multiple streams', async () => {
    const stIds = await createStreamHelper(ts, ts.address, (info) => ({
      ...info,
      recipients: [info.recipients[0], info.recipients[0]], // Same recipient info
    }));
    const sg = await StreamGroup.new(ts.globals, stIds);
    expect(sg.streams.length).toBe(2);

    expect(sg.progress.total).toBe(sg.streams.reduce((sum, st) => sum + st.totalAmount, 0n));
  });

  it('multiple streams with different group id shall throw error', async () => {
    const stIds = await createStreamHelper(ts, ts.address);
    const stIds2 = await createStreamHelper(ts, ts.address);
    await expect(StreamGroup.new(ts.globals, [...stIds, ...stIds2])).rejects.toThrow(InvalidStreamGroupError);
  });

  it('multiple streams with different settings shall throw error', async () => {
    const metadata = encodeMetadata({
      name: 'test name',
      groupId: generateGroupId(),
    });
    const stIds = await createStreamHelper(ts, ts.address, (info) => ({
      ...info,
      metadata,
    }));
    const stIds2 = await createStreamHelper(ts, ts.address, (info) => ({
      ...info,
      metadata,
      epochInterval: 2000n,
    }));
    await expect(StreamGroup.new(ts.globals, [...stIds, ...stIds2])).rejects.toThrow(InvalidStreamGroupError);
  });

  it('refresh', async () => {
    const stIds = await createStreamHelper(ts, ts.address, (info) => ({
      ...info,
      recipients: [info.recipients[0], info.recipients[0]], // Same recipient info
    }));
    const sg = await StreamGroup.new(ts.globals, stIds);

    // Cancel the first stream, and refresh
    const txb = await sg.streams[0].cancel();
    const res = await ts.wallet.signAndSubmitTransaction(txb);
    expect(res.effects?.status.status).toBe('success');
    expect(sg.streams[0].progress.status).toBe(StreamStatus.STREAMING);

    // After refresh, the status will be changed to canceled, while the other stream remains the same
    await sg.refresh();
    expect(sg.streams[0].progress.status).toBe(StreamStatus.CANCELED);
    expect(sg.streams[1].progress.status).toBe(StreamStatus.STREAMING);
    expect(sg.progress.canceled).toBeGreaterThan(0n);
  });
});
