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
    const txb = await st.claim();
    const res = await ts.wallet.signAndSubmitTransaction(txb);
    expect((res as SuiTransactionBlockResponse).effects?.status?.status).toBe('success');

    await st.refresh();
    expect(st.progress.streamed).toBeGreaterThan(0n);
    expect(st.progress.status).toBe('STREAMING');
  });

  it('cancel', async () => {
    const stIds = await createStreamHelper(ts, ts.address);
    const st = await Stream.new(ts.globals, stIds[0]);

    expect(st.cancelable).toBeTruthy();
    expect(st.progress.status).toBe('STREAMING');

    const txb = await st.cancel();
    const res = await ts.wallet.signAndSubmitTransaction(txb);
    expect((res as SuiTransactionBlockResponse).effects?.status?.status).toBe('success');

    await st.refresh();
    expect(st.progress.canceled).toBeGreaterThan(0n);
    expect(st.progress.status === 'CANCELED' || st.progress.status === 'SETTLED').toBeTruthy();
  });

  it('set auto claim and claim by proxy', async () => {
    const stIds = await createStreamHelper(ts, ts.address);
    const st = await Stream.new(ts.globals, stIds[0]);

    expect(st.autoClaim).toBeFalsy();
    expect(st.streamStatus).toBe('STREAMING');
    const txb1 = await st.setAutoClaim(true);
    const res1 = await ts.wallet.signAndSubmitTransaction(txb1);
    expect((res1 as SuiTransactionBlockResponse).effects?.status.status).toBe('success');
    await st.refresh();
    expect(st.autoClaim).toBeTruthy();

    if (st.claimable === 0n) {
      await sleep(1000);
      await st.refresh();
    }
    expect(st.claimable).toBeGreaterThan(0n);
    const txb2 = await st.claimByProxy();
    const res2 = await ts.wallet.signAndSubmitTransaction(txb2);
    expect((res2 as SuiTransactionBlockResponse).effects?.status?.status).toBe('success');
    expect(st.progress.streamed).toBeGreaterThan(0n);
    expect(st.progress.status).toBe('STREAMING');
  });
});
