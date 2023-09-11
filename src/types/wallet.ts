import { DevInspectResults, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

export enum WalletType {
  single = 'single',
  msafe = 'msafe',
}

/**
 * IWallet is the adapted interface of wallet. Supports both single wallet and msafe.
 */
export interface IWallet {
  type: WalletType;

  address(): Promise<string>;

  requestCoin(reqs: CoinRequest): Promise<CoinRequestResponse>;

  // Depending on the wallet type, return transaction digest or sui rpc response
  execute(txb: TransactionBlock): Promise<string | SuiTransactionBlockResponse>;

  inspect(txb: TransactionBlock): Promise<DevInspectResults>;
}

/**
 * ISingleWallet is the raw interface of msafe account.
 * Need to adapt to IWallet interface
 */
export interface IMSafeAccount {
  address(): Promise<string>;

  // return coin objects by amount.
  requestCoin(reqs: CoinRequest): Promise<CoinRequestResponse>;

  propose(txb: TransactionBlock): Promise<string>; // Return transaction digest

  inspect(txb: TransactionBlock): Promise<DevInspectResults>;
}

/**
 * ISingleWallet is the raw interface of single signer wallet.
 * Need to adapt to IWallet interface
 */
export interface ISingleWallet {
  address(): Promise<string>;

  signAndSubmitTransaction(txb: TransactionBlock): Promise<SuiTransactionBlockResponse>;

  inspect(txb: TransactionBlock): Promise<DevInspectResults>;
}

export interface CoinRequest {
  coinType: string;
  amount: bigint;
}

export interface CoinRequestResponse {
  primaryCoin: string;
  mergedCoins: string[];
}
