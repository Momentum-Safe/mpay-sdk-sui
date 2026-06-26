import type { SuiClientTypes } from '@mysten/sui/client';

/** Balance shape consumed by MPay helper APIs. */
export interface MPayCoinBalance {
  coinType: string;
  totalBalance: string;
  coinObjectCount: number;
}

export function toMpayCoinBalance(balance: SuiClientTypes.Balance): MPayCoinBalance {
  return {
    coinType: balance.coinType,
    totalBalance: balance.balance,
    coinObjectCount: 0,
  };
}
