import { SuiTransactionBlockResponse } from '@mysten/sui.js/client';

import { Stream } from '@/stream/Stream';

import { getTestSuite, TestSuite } from '../../lib/setup';
import { createStreamHelper } from '../../lib/stream';
import { sleep } from '../../lib/utils';

describe('stream', () => {
  let ts: TestSuite;

  beforeAll(async () => {
    ts = await getTestSuite();
  });

  it('newFromId', async () => {
    const stIds = await createStreamHelper(ts, ts.address);
    const st = await Stream.new(ts.globals, stIds[0]);

    expect(st.info.name).toBe('test name');
    expect(st.info.groupId).toBeDefined();
  });

  it('claim', async () => {
    const stIds = await createStreamHelper(ts, ts.address);
    const st = await Stream.new(ts.globals, stIds[0]);

    if (st.claimable === 0n) {
      await sleep(1000);
      await st.refresh();
    }
    expect(st.claimable).toBeGreaterThan(0n);
    const res = await st.claim();
    expect((res as SuiTransactionBlockResponse).effects?.status?.status).toBe('success');
    expect(st.progress.streamed).toBeGreaterThan(0n);
    expect(st.progress.status).toBe('STREAMING');
  });

  it('cancel', async () => {
    const stIds = await createStreamHelper(ts, ts.address);
    const st = await Stream.new(ts.globals, stIds[0]);

    expect(st.cancelable).toBeTruthy();
    expect(st.progress.status).toBe('STREAMING');

    const res = await st.cancel();
    await st.refresh();
    expect((res as SuiTransactionBlockResponse).effects?.status?.status).toBe('success');

    expect(st.progress.status === 'CANCELED' || st.progress.status === 'SETTLED').toBeTruthy();
  });

  it('set auto claim and claim by proxy', async () => {
    const stIds = await createStreamHelper(ts, ts.address);
    const st = await Stream.new(ts.globals, stIds[0]);

    expect(st.cancelable).toBeTruthy();
    expect(st.streamStatus).toBe('STREAMING');
    const res1 = await st.setAutoClaim(true);
    expect((res1 as SuiTransactionBlockResponse).effects?.status.status).toBe('success');
    expect(st.cancelable).toBeTruthy();

    if (st.claimable === 0n) {
      await sleep(1000);
      await st.refresh();
    }
    expect(st.claimable).toBeGreaterThan(0n);
    const res2 = await st.claimByProxy();
    expect((res2 as SuiTransactionBlockResponse).effects?.status?.status).toBe('success');
    expect(st.progress.streamed).toBeGreaterThan(0n);
    expect(st.progress.status).toBe('STREAMING');
  });
});
