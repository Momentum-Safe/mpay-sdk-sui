import { MPayError, MPayErrorCode } from '@/error/base';

export class WalletNotConnectedError extends MPayError {
  constructor() {
    super(MPayErrorCode.walletNotConnected, 'Wallet not connected');
  }
}
