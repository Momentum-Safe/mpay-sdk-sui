import { Globals } from '@/common/globals';
import { getAllOwnedCoins } from '@/sui/iterator/coin';

import { newUnitGlobals, setupTestWallet } from '../../lib/setup';

describe('coin', () => {
  let address: string;
  let globals: Globals;
  const expCoinLength = 5;

  beforeAll(async () => {
    const wallet = await setupTestWallet();
    globals = newUnitGlobals();
    address = await wallet.address();
  });

  it('get all coins', async () => {
    const coins = await getAllOwnedCoins(globals.suiClient, address);
    expect(coins.length).toEqual(expCoinLength);
  });

  it('get all coins with multiple pages', async () => {
    const coins = await getAllOwnedCoins(globals.suiClient, address, '0x2::sui::SUI', 1);
    expect(coins.length).toEqual(expCoinLength);
  });

  it('multiple pages 2', async () => {
    const coins = await getAllOwnedCoins(globals.suiClient, address, '0x2::sui::SUI', 2);
    expect(coins.length).toEqual(expCoinLength);
  });
});
