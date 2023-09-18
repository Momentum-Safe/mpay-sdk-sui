import { TransactionBlock } from '@mysten/sui.js/transactions';

import { Env, EnvConfigOptions } from '@/common/env';
import { Globals } from '@/common/globals';
import { MPayBuilder } from '@/transaction/MPayBuilder';
import { IMSafeAccount, ISingleWallet } from '@/types/wallet';
import { MSafeAccountAdapter } from '@/wallet/MSafeAccountAdapter';
import { SingleWalletAdapter } from '@/wallet/SingleWalletAdapter';

// export class MPayClient implements IMPayClient {
export class MPayClient {
  public readonly globals: Globals;

  constructor(env: Env, options?: EnvConfigOptions) {
    this.globals = Globals.new(env, options);
  }

  connectSingleWallet(wallet: ISingleWallet) {
    const adapter = new SingleWalletAdapter(wallet, this.globals.suiClient);
    this.globals.connectWallet(adapter);
  }

  connectMSafeAccount(msafe: IMSafeAccount) {
    const adapter = new MSafeAccountAdapter(msafe);
    this.globals.connectWallet(adapter);
  }

  builder() {
    return new MPayBuilder(this.globals);
  }

  async executeTransactionBlock(txb: TransactionBlock) {
    return this.wallet.execute(txb);
  }

  async inspectTransactionBlock(txb: TransactionBlock) {
    return this.wallet.inspect(txb);
  }

  get wallet() {
    return this.globals.wallet;
  }
}
