import { TransactionBlock } from '@mysten/sui.js/transactions';

import { Globals } from '@/common/globals';
import { MoveObject } from '@/contracts/common';
import { CLOCK_ID } from '@/contracts/const';
import { WalletNotConnectedError } from '@/error/WalletNotConnectedError';
import { IMSafeAccount, ISingleWallet } from '@/types/wallet';

export class ContractCall {
  constructor(
    public readonly txb: TransactionBlock,
    public readonly globals: Globals,
  ) {}

  async execute() {
    if (this.globals.walletType === 'single') {
      const wallet = this.globals.wallet as ISingleWallet;
      return wallet.signAndSubmitTransaction(this.txb);
    }

    if (this.globals.walletType === 'msafe') {
      const wallet = this.globals.wallet as IMSafeAccount;
      return wallet.propose(this.txb);
    }

    throw new WalletNotConnectedError();
  }

  async inspect() {
    return this.globals.wallet.inspect(this.txb);
  }

  static clockObject() {
    return new MoveObject(CLOCK_ID);
  }
}
