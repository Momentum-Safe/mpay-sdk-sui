import { MPayError, MPayErrorCode } from '@/error/base';

export class NotEnoughBalanceError extends MPayError {
  constructor(
    public readonly coinType: string,
    public readonly requestAmount: bigint,
    public readonly gotAmount: bigint,
  ) {
    super(MPayErrorCode.NotEnoughBalance, `Not enough balance: ${coinType}`, {
      context: {
        coinType,
        requestAmount,
        gotAmount,
      },
    });
  }
}
