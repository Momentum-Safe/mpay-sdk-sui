import { Globals } from '@/common/globals';
import { getAllOwnedCoins } from '@/sui/iterator/coin';

import { setupTestWallet } from '../../lib/setup';

describe('coin', () => {
  let address: string;
  let globals: Globals;

  beforeAll(async () => {
    const res = await setupTestWallet();
    globals = res.globals;
    address = await res.testWallet.address();
  });

  it('get all coins', async () => {
    const coins = await getAllOwnedCoins(globals.suiClient, address);
    expect(coins.length).toBeGreaterThanOrEqual(0);
  });

  it('get all coins with multiple pages', async () => {
    const coins = await getAllOwnedCoins(globals.suiClient, address, '0x2::sui::SUI', 1);
    expect(coins.length).toBeGreaterThanOrEqual(0);
  });

  it('multiple pages 2', async () => {
    const coins = await getAllOwnedCoins(globals.suiClient, address, '0x2::sui::SUI', 2);
    expect(coins.length).toBeGreaterThanOrEqual(0);
  });
});
