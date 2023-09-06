import { SuiClient } from '@mysten/sui.js/client';
import { requestSuiFromFaucetV0 } from '@mysten/sui.js/faucet';

import { EnvConfig } from '@/common/env';
import { SanityError } from '@/error/SanityError';
import { WalletNotConnectedError } from '@/error/WalletNotConnectedError';
import { IMSafeAccount, ISingleWallet, IWallet } from '@/types/wallet';

export class Globals {
  public walletType: 'single' | 'msafe' | 'disconnected';

  public signer: IWallet | undefined;

  public readonly suiClient: SuiClient;

  public readonly envConfig: EnvConfig;

  constructor(envConfig: EnvConfig) {
    this.envConfig = envConfig;
    this.suiClient = new SuiClient({ url: envConfig.rpc.url });
    this.walletType = 'disconnected';
  }

  connectWallet(wallet: ISingleWallet) {
    this.walletType = 'single';
    this.signer = wallet;
  }

  connectMSafe(msafe: IMSafeAccount) {
    this.walletType = 'msafe';
    this.signer = msafe;
  }

  disconnect() {
    this.walletType = 'disconnected';
    this.signer = undefined;
  }

  get wallet(): IWallet {
    if (!this.signer) {
      throw new WalletNotConnectedError();
    }
    return this.signer;
  }

  async walletAddress() {
    return this.wallet.address();
  }

  async requestFaucet(address: string) {
    if (!this.envConfig.rpc.faucet) {
      throw new SanityError('Faucet not supported');
    }
    return requestSuiFromFaucetV0({
      host: this.envConfig.rpc.faucet,
      recipient: address,
    });
  }
}
