import { SuiClient } from '@mysten/sui.js/client';
import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { InvalidInputError } from '@/error/InvalidInputError';
import { SanityError } from '@/error/SanityError';
import { getCoinsWithAmount } from '@/sui/iterator/coin';
import { isSameCoinType } from '@/sui/utils';
import { CoinRequest, CoinRequestResponse, GAS_OBJECT_SPEC, ISingleWallet, IWallet, WalletType } from '@/types/wallet';

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

  async requestCoin(req: CoinRequest): Promise<CoinRequestResponse> {
    if (isSameCoinType(req.coinType, SUI_TYPE_ARG)) {
      return {
        primaryCoin: GAS_OBJECT_SPEC,
      };
    }
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
