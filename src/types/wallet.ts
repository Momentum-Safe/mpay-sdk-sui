import { TransactionBlock } from '@mysten/sui.js/transactions';

export interface IMSafeAccount {
  address(): Promise<string>;

  signAndSubmitTransaction(tx: TransactionBlock): void;

  // return coin objects by amount.
  requestCoins(amount: bigint, coinType: string): string[];
}

export interface ISingleWallet {
  address(): Promise<string>;

  signAndSubmitTransaction(tx: TransactionBlock): void;
}
