import { Stream } from '@/stream';
import { expectTransactionSuccess } from './lib/transaction';
import { sleep } from './lib/utils';

import { getActiveStream } from './lib/chain-fixtures';

describe('integration', () => {
  it('single stream creation', async () => {
    const { ts, stream } = await getActiveStream();

    expect(stream.info.name).toBe('test name');
    expect(stream.streamId).toBeDefined();

    const setAutoClaimTxb = await stream.setAutoClaim(true);
    expectTransactionSuccess(await ts.wallet.signAndSubmitTransaction(setAutoClaimTxb));

    await sleep(1500);
    await stream.refresh();

    if (stream.claimable > 0n) {
      const claimTxb = await stream.claim();
      expectTransactionSuccess(await ts.wallet.signAndSubmitTransaction(claimTxb));
    }
  });
});
