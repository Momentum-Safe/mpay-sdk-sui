import { Env, getConfig } from '@/common/env';
import { Globals } from '@/common/globals';
import { MPayHelper } from '@/stream/helper';
import type { MPaySuiClient } from '@/sui/client';

const ADDRESS = '0xb924811f0b632a013389ce4038ba8fe565f3cef006df9d960ff3b163e2c08543';
const SUI_META = {
  decimals: 9,
  name: 'Sui',
  symbol: 'SUI',
  description: '',
  iconUrl: null,
  id: '0x2',
};

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('balance reads', () => {
  it('shares one in-flight balance list and fetches again after it settles', async () => {
    const gate = deferred();
    let balanceCalls = 0;
    let metaCalls = 0;
    const suiClient = {
      async listBalances() {
        balanceCalls += 1;
        await gate.promise;
        return { balances: [{ coinType: '0x2::sui::SUI', balance: '10' }] };
      },
      async getCoinMetadata() {
        metaCalls += 1;
        return { coinMetadata: SUI_META };
      },
    } as unknown as MPaySuiClient;
    const helper = new MPayHelper(new Globals(getConfig(Env.local), suiClient));

    const first = helper.getAllBalance(ADDRESS);
    const second = helper.getAllBalance(ADDRESS);
    expect(balanceCalls).toBe(1);

    gate.resolve();
    const [left, right] = await Promise.all([first, second]);
    expect(left).toEqual(right);
    expect(left[0]?.totalBalance).toBe('10');
    expect(metaCalls).toBe(1);

    await helper.getAllBalance(ADDRESS);
    expect(balanceCalls).toBe(2);
  });

  it('starts the balance read and the metadata read together', async () => {
    const balanceGate = deferred();
    const metaGate = deferred();
    let metaStarted = false;
    const suiClient = {
      async getBalance() {
        await balanceGate.promise;
        return { balance: { coinType: '0x2::sui::SUI', balance: '5' } };
      },
      async getCoinMetadata() {
        metaStarted = true;
        await metaGate.promise;
        return { coinMetadata: SUI_META };
      },
    } as unknown as MPaySuiClient;
    const helper = new MPayHelper(new Globals(getConfig(Env.local), suiClient));

    const pending = helper.getBalance(ADDRESS, '0x2::sui::SUI');
    expect(metaStarted).toBe(true);
    balanceGate.resolve();
    metaGate.resolve();
    const balance = await pending;
    expect(balance.totalBalance).toBe('5');
    expect(balance.coinMeta?.symbol).toBe('SUI');
  });

  it('shares one in-flight metadata lookup', async () => {
    const gate = deferred();
    let metaCalls = 0;
    const suiClient = {
      async getCoinMetadata() {
        metaCalls += 1;
        await gate.promise;
        return { coinMetadata: SUI_META };
      },
    } as unknown as MPaySuiClient;
    const helper = new MPayHelper(new Globals(getConfig(Env.local), suiClient));

    const first = helper.getCoinMeta('0x2::sui::SUI');
    const second = helper.getCoinMeta('0x2::sui::SUI');
    expect(metaCalls).toBe(1);
    gate.resolve();
    await Promise.all([first, second]);
    await helper.getCoinMeta('0x2::sui::SUI');
    expect(metaCalls).toBe(1);
  });
});
