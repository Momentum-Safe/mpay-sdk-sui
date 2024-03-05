import { Env } from '@/common';
import { MPayClient } from '@/stream';
import { StreamStatus } from '@/types';

import { FakeWallet } from '../lib/wallet';

describe('playground', () => {
  it.skip('playground', async () => {
    const client = new MPayClient(Env.dev);
    client.connectSingleWallet(new FakeWallet('0xfa0f8542f256e669694624aa3ee7bfbde5af54641646a3a05924cf9e329a8a36'));
    const it = await client.getIncomingStreams({
      status: [StreamStatus.STREAMING],
    });

    while (await it.hasNext()) {
      const sg = await it.next();
      expect(sg).toBeDefined();
    }
  });
});
