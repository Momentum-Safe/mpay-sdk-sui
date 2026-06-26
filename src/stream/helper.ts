import type { SuiClientTypes } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag, SUI_TYPE_ARG } from '@mysten/sui/utils';
import { DateTime, Duration } from 'luxon';

import { Globals } from '@/common/globals';
import { InvalidInputError } from '@/error/InvalidInputError';
import { getCreatedObjectIdsFromTransaction, TransactionResultWithEffects } from '@/sui/adapters';
import type { MPaySuiClient, SimulateTransactionResult } from '@/sui/client';
import { toMpayCoinBalance } from '@/sui/balance';
import { CreateStreamHelper } from '@/transaction/builder/CreateStreamHelper';
import { MPayBuilder } from '@/transaction/builder/MPayBuilder';
import {
  CalculatedStreamAmount,
  CalculatedTimeline,
  CreateStreamInfo,
  Fraction,
  IMPayHelper,
  MPayFees,
  PaymentWithFee,
} from '@/types';

// Minimum time interval is 1 second
export const MIN_INTERVAL_MS = 1000;

export class MPayHelper implements IMPayHelper {
  private readonly coinMetaHelper: CoinMetaHelper;

  private readonly createStreamHelper: CreateStreamHelper;

  constructor(public readonly globals: Globals) {
    this.coinMetaHelper = new CoinMetaHelper(globals.suiClient);
    this.createStreamHelper = new MPayBuilder(globals).createStreamHelper();
  }

  getStreamIdsFromCreateStreamResponse(res: TransactionResultWithEffects) {
    return getCreatedObjectIdsFromTransaction(
      res,
      `${this.globals.envConfig.contract.contractId}::stream::Stream`,
    );
  }

  calculateCreateStreamFees(info: CreateStreamInfo): PaymentWithFee {
    return this.createStreamHelper.calculateCreateStreamFees(info);
  }

  feeParams(): MPayFees {
    return this.createStreamHelper.feeParams();
  }

  calculateStreamAmount(input: { totalAmount: bigint; steps: bigint; cliff?: Fraction }): CalculatedStreamAmount {
    if (input.steps === 0n) {
      throw new InvalidInputError('Invalid stream steps: 0');
    }
    const cliffFraction = input.cliff
      ? input.cliff
      : {
          numerator: 0n,
          denominator: 100n,
        };
    const cliffAmount = (input.totalAmount * cliffFraction.numerator) / cliffFraction.denominator;
    const amountPerStep = (input.totalAmount - cliffAmount) / input.steps;
    const realTotalAmount = amountPerStep * input.steps + cliffAmount;

    const res = {
      realTotalAmount,
      cliffAmount,
      amountPerStep,
    };
    this.validateStreamAmount(res, input.totalAmount);
    return res;
  }

  calculateTimelineByInterval(input: { timeStart: DateTime; interval: Duration; steps: bigint }): CalculatedTimeline {
    if (input.steps === 0n) {
      throw new InvalidInputError('Invalid stream steps: 0');
    }
    const timeEnd = input.timeStart.plus(input.interval.toMillis() * Number(input.steps));

    const res = {
      timeStart: input.timeStart,
      timeEnd,
      interval: input.interval,
      steps: input.steps,
    };
    this.validateTimeline(res);
    return res;
  }

  calculateTimelineByTotalDuration(input: { timeStart: DateTime; total: Duration; steps: bigint }): CalculatedTimeline {
    if (input.steps === 0n) {
      throw new InvalidInputError('Invalid stream steps: 0');
    }
    const intervalMilli = BigInt(input.total.toMillis()) / input.steps;
    const timeEnd = input.timeStart.plus(Duration.fromMillis(Number(intervalMilli * input.steps)));
    const res = {
      timeStart: input.timeStart,
      timeEnd,
      interval: Duration.fromMillis(Number(intervalMilli)),
      steps: input.steps,
    };
    this.validateTimeline(res);
    return res;
  }

  async getBalance(address: string, coinType?: string | null) {
    const { balance } = await this.globals.suiClient.getBalance({
      owner: address,
      coinType: coinType ?? undefined,
    });
    const coinMeta = await this.getCoinMeta(coinType);
    return {
      ...toMpayCoinBalance(balance),
      coinType: normalizeStructTag(balance.coinType),
      coinMeta,
    };
  }

  async getAllBalance(address: string) {
    const { balances } = await this.globals.suiClient.listBalances({
      owner: address,
    });
    const coinMetas = await Promise.all(balances.map((bal) => this.getCoinMeta(bal.coinType)));
    return balances.map((bal: SuiClientTypes.Balance, i: number) => ({
      ...toMpayCoinBalance(bal),
      coinType: normalizeStructTag(bal.coinType),
      coinMeta: coinMetas[i],
    }));
  }

  async getCoinMeta(coinType: string | null | undefined) {
    return this.coinMetaHelper.getCoinMeta(coinType);
  }

  async simulateTransaction(txb: Transaction): Promise<SimulateTransactionResult> {
    txb.setSender(await this.globals.wallet.address());
    return this.globals.suiClient.simulateTransaction({
      transaction: txb,
      checksEnabled: false,
      include: { commandResults: true },
    });
  }

  private validateStreamAmount(val: CalculatedStreamAmount, originTotalAmount: bigint) {
    if (val.amountPerStep === 0n) {
      throw new InvalidInputError('Stream amount too small', 'totalAmount', originTotalAmount);
    }
    if (val.cliffAmount > val.realTotalAmount) {
      throw new InvalidInputError('Invalid cliff settings');
    }
  }

  private validateTimeline(val: CalculatedTimeline) {
    if (val.interval.toMillis() < MIN_INTERVAL_MS) {
      throw new InvalidInputError('Interval shall be at least 1 second', 'interval', val.interval);
    }
  }
}

export class CoinMetaHelper {
  private coinMetaReg: Map<string, SuiClientTypes.CoinMetadata>;

  constructor(private readonly suiClient: MPaySuiClient) {
    this.coinMetaReg = new Map();
  }

  async getCoinMeta(coinType: string | null | undefined): Promise<SuiClientTypes.CoinMetadata | undefined> {
    const normalized = normalizeStructTag(coinType || SUI_TYPE_ARG);
    if (this.coinMetaReg.has(normalized)) {
      return this.coinMetaReg.get(normalized);
    }
    const meta = await this.queryCoinMeta(normalized);
    if (meta) {
      this.coinMetaReg.set(normalized, meta);
    }
    return meta;
  }

  private async queryCoinMeta(coinType: string): Promise<SuiClientTypes.CoinMetadata | undefined> {
    const { coinMetadata } = await this.suiClient.getCoinMetadata({ coinType });
    return coinMetadata || undefined;
  }
}
