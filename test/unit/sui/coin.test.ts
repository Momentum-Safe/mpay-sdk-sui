import { getAllOwnedCoins } from '@/sui/iterator/coin';

import { UnitGlobals } from '../../lib/env';
import { LocalWallet } from '../../lib/wallet';

describe('coin', () => {
  let address: string;
  const expCoinLength = 5;

  beforeAll(async () => {
    const wallet = new LocalWallet(UnitGlobals.suiClient);
    await UnitGlobals.requestFaucet(address);
    address = await wallet.address();
  });

  it('get all coins', async () => {
    const coins = await getAllOwnedCoins(UnitGlobals.suiClient, address);
    expect(coins.length).toEqual(expCoinLength);
  });

  it('get all coins with multiple pages', async () => {
    const coins = await getAllOwnedCoins(UnitGlobals.suiClient, address, '0x2::sui::SUI', 1);
    expect(coins.length).toEqual(expCoinLength);
  });

  it('multiple pages 2', async () => {
    const coins = await getAllOwnedCoins(UnitGlobals.suiClient, address, '0x2::sui::SUI', 2);
    expect(coins.length).toEqual(expCoinLength);
  });
});
