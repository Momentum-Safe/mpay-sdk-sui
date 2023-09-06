import { DevInspectResults } from '@mysten/sui.js';
import { SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

export interface IMSafeAccount {
  address(): Promise<string>;

  propose(tx: TransactionBlock): Promise<string>; // Return transaction digest

  // return coin objects by amount.
  requestCoins(amount: bigint, coinType: string): string[];

  inspect(txb: TransactionBlock): Promise<DevInspectResults>;
}

export interface ISingleWallet {
  address(): Promise<string>;

  signAndSubmitTransaction(tx: TransactionBlock): Promise<SuiTransactionBlockResponse>;

  inspect(txb: TransactionBlock): Promise<DevInspectResults>;
}

export type IWallet = IMSafeAccount | ISingleWallet;
