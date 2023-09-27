import { CoinMetadata, SuiClient, SuiObjectChangeCreated, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { normalizeStructTag } from '@mysten/sui.js/utils';
import { DateTime, Duration } from 'luxon';

import { Globals } from '@/common/globals';
import { InvalidInputError } from '@/error/InvalidInputError';
import { TransactionFailedError } from '@/error/TransactionFailedError';
import { CalculatedStreamAmount, CalculatedTimeline, Fraction, IMPayHelper } from '@/types';

// Minimum time interval is 1 second
export const MIN_INTERVAL_MS = 1000;

export class MPayHelper implements IMPayHelper {
  private readonly coinMetaHelper: CoinMetaHelper;

  constructor(public readonly globals: Globals) {
    this.coinMetaHelper = new CoinMetaHelper(globals.suiClient);
  }

  getStreamIdsFromCreateStreamResponse(res: SuiTransactionBlockResponse) {
    if (res.effects?.status.status !== 'success') {
      throw new TransactionFailedError(res.effects?.status.status, res.effects?.status.error);
    }
    return res
      .objectChanges!.filter(
        (change) =>
          change.type === 'created' &&
          change.objectType.startsWith(`${this.globals.envConfig.contract.contractId}::stream::Stream`),
      )
      .map((change) => (change as SuiObjectChangeCreated).objectId);
  }

  calculateStreamAmount(input: { totalAmount: bigint; steps: bigint; cliff?: Fraction }): CalculatedStreamAmount {
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
    return this.globals.suiClient.getBalance({
      owner: address,
      coinType,
    });
  }

  async getAllBalance(address: string) {
    return this.globals.suiClient.getAllBalances({
      owner: address,
    });
  }

  async getCoinMeta(coinType: string) {
    return this.coinMetaHelper.getCoinMeta(coinType);
  }

  private validateStreamAmount(val: CalculatedStreamAmount, originTotalAmount: bigint) {
    if (val.amountPerStep === 0n) {
      throw new InvalidInputError('Stream amount too small', 'totalAmount', originTotalAmount);
    }
  }

  private validateTimeline(val: CalculatedTimeline) {
    if (val.interval.toMillis() < MIN_INTERVAL_MS) {
      throw new InvalidInputError('Interval shall be at least 1 second', 'interval', val.interval);
    }
  }
}

export class CoinMetaHelper {
  private coinMetaReg: Map<string, CoinMetadata>;

  constructor(private readonly suiClient: SuiClient) {
    this.coinMetaReg = new Map();
  }

  async getCoinMeta(coinType: string): Promise<CoinMetadata | undefined> {
    const normalized = normalizeStructTag(coinType);
    if (this.coinMetaReg.has(normalized)) {
      return this.coinMetaReg.get(normalized);
    }
    const meta = await this.queryCoinMeta(normalized);
    if (meta) {
      this.coinMetaReg.set(normalized, meta);
    }
    return meta;
  }

  private async queryCoinMeta(coinType: string): Promise<CoinMetadata | undefined> {
    const res = await this.suiClient.getCoinMetadata({ coinType });
    return res || undefined;
  }
}
