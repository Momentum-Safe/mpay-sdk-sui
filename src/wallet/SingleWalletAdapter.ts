import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { InvalidInputError } from '@/error/InvalidInputError';
import { SanityError } from '@/error/SanityError';
import { getCoinsWithAmount } from '@/sui/iterator/coin';
import { CoinRequest, CoinRequestResponse, ISingleWallet, IWallet, WalletType } from '@/types/wallet';

/**
 * SingleWalletAdapter adapts ISingleWallet to IWallet
 */
export class SingleWalletAdapter implements IWallet {
  constructor(
    private readonly singleWallet: ISingleWallet,
    private readonly suiClient: SuiClient,
  ) {}

  get type() {
    return WalletType.single;
  }

  async address() {
    return this.singleWallet.address();
  }

  async execute(txb: TransactionBlock) {
    return this.singleWallet.signAndSubmitTransaction(txb);
  }

  async inspect(txb: TransactionBlock) {
    return this.singleWallet.inspect(txb);
  }

  async requestCoin(req: CoinRequest): Promise<CoinRequestResponse> {
    if (req.amount <= 0) {
      throw new InvalidInputError('Invalid coin request', 'coinAmount', req.amount);
    }
    const coins = await getCoinsWithAmount(this.suiClient, await this.address(), req.amount, req.coinType);
    if (coins.length === 0) {
      throw new SanityError('no coins available');
    }
    return {
      primaryCoin: coins[0].coinObjectId,
      mergedCoins: coins.slice(1).map((coin) => coin.coinObjectId),
    };
  }
}
