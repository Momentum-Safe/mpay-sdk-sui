import { Stream } from '@/stream/Stream';

import { getActiveStream, getPendingCancelStream } from '../../lib/chain-fixtures';
import { expectTransactionSuccess } from '../../lib/transaction';
import { sleep } from '../../lib/utils';

describe('stream', () => {
  let ts: Awaited<ReturnType<typeof getActiveStream>>['ts'];
  let sharedStream: Stream;

  beforeAll(async () => {
    const res = await getActiveStream();
    ts = res.ts;
    sharedStream = res.stream;
  });

  it('newFromId', async () => {
    expect(sharedStream.info.name).toBe('test name');
    expect(sharedStream.info.groupId).toBeDefined();
  });

  it('claim', async () => {
    if (sharedStream.claimable === 0n) {
      await sleep(1000);
      await sharedStream.refresh();
    }
    expect(sharedStream.claimable).toBeGreaterThan(0n);
    const txb = await sharedStream.claim();
    const res = await ts.wallet.signAndSubmitTransaction(txb);
    expectTransactionSuccess(res);

    await sharedStream.refresh();
    expect(sharedStream.progress.streamed).toBeGreaterThan(0n);
    expect(sharedStream.progress.status).toBe('STREAMING');
  });

  it('set auto claim and claim by proxy', async () => {
    expect(sharedStream.autoClaim).toBeFalsy();
    expect(sharedStream.streamStatus).toBe('STREAMING');
    const txb1 = await sharedStream.setAutoClaim(true);
    const res1 = await ts.wallet.signAndSubmitTransaction(txb1);
    expectTransactionSuccess(res1);
    await sharedStream.refresh();
    expect(sharedStream.autoClaim).toBeTruthy();

    if (sharedStream.claimable === 0n) {
      await sleep(1000);
      await sharedStream.refresh();
    }
    expect(sharedStream.claimable).toBeGreaterThan(0n);
    const txb2 = await sharedStream.claimByProxy();
    const res2 = await ts.wallet.signAndSubmitTransaction(txb2);
    expectTransactionSuccess(res2);
    expect(sharedStream.progress.streamed).toBeGreaterThan(0n);
    expect(sharedStream.progress.status).toBe('STREAMING');
  });

  it('cancel', async () => {
    const { stream: cancelStream } = await getPendingCancelStream();

    expect(cancelStream.cancelable).toBeTruthy();
    expect(cancelStream.progress.status).toBe('STREAMING');

    const txb = await cancelStream.cancel();
    const res = await ts.wallet.signAndSubmitTransaction(txb);
    expectTransactionSuccess(res);

    await sleep(1500);
    await cancelStream.refresh();
    expect(cancelStream.progress.status === 'CANCELED' || cancelStream.progress.status === 'SETTLED').toBeTruthy();
  });
});
