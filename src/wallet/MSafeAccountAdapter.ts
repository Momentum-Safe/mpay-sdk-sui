import { TransactionBlock } from '@mysten/sui.js/transactions';

import { CoinRequest, CoinRequestResponse, IMSafeAccount, IWallet, WalletType } from '@/types/wallet';

export class MSafeAccountAdapter implements IWallet {
  constructor(private readonly msafe: IMSafeAccount) {}

  get type() {
    return WalletType.msafe;
  }

  async address() {
    return this.msafe.address();
  }

  async requestCoin(reqs: CoinRequest): Promise<CoinRequestResponse> {
    return this.msafe.requestCoin(reqs);
  }

  async execute(txb: TransactionBlock) {
    return this.msafe.propose(txb);
  }

  async inspect(txb: TransactionBlock) {
    return this.msafe.inspect(txb);
  }
}
