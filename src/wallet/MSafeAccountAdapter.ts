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
}
