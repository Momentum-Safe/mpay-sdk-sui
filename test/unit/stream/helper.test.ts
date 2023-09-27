import { DateTime, Duration } from 'luxon';

import { InvalidInputError } from '@/error/InvalidInputError';
import { MPayHelper } from '@/stream/helper';

import { newUnitGlobals } from '../../lib/setup';

describe('MPayHelper', () => {
  let helper: MPayHelper;

  beforeAll(() => {
    helper = new MPayHelper(newUnitGlobals());
  });

  it('calculateStreamAmount', () => {
    const res = helper.calculateStreamAmount({
      totalAmount: 10000n,
      steps: 3n,
      cliff: { numerator: 10n, denominator: 100n },
    });
    expect(res.cliffAmount).toBe(1000n);
    expect(res.realTotalAmount).toBe(10000n);
    expect(res.amountPerStep).toBe(3000n);
  });

  it('calculate stream amount not exact and omit cliff', () => {
    const res = helper.calculateStreamAmount({
      totalAmount: 10000n,
      steps: 3n,
    });
    expect(res.cliffAmount).toBe(0n);
    expect(res.realTotalAmount).toBe(9999n);
    expect(res.amountPerStep).toBe(3333n);
  });

  it('calculateStreamAmount failed', () => {
    expect(() =>
      helper.calculateStreamAmount({
        totalAmount: 10000n,
        steps: 10001n,
      }),
    ).toThrow(InvalidInputError);
  });

  it('calculateTimelineByInterval', () => {
    const res = helper.calculateTimelineByInterval({
      timeStart: DateTime.now(),
      interval: Duration.fromMillis(1000),
      steps: 10000n,
    });
    expect(res.timeEnd.toMillis() - res.timeStart.toMillis()).toBe(1000 * 10000);
  });

  it('calculateTimelineByInterval failed short interval', () => {
    expect(() =>
      helper.calculateTimelineByInterval({
        timeStart: DateTime.now(),
        interval: Duration.fromMillis(999),
        steps: 10000n,
      }),
    ).toThrow(InvalidInputError);
  });

  it('calculateTimelineByTotalDuration', () => {
    const res = helper.calculateTimelineByTotalDuration({
      timeStart: DateTime.now(),
      total: Duration.fromMillis(10000),
      steps: 10n,
    });
    expect(res.interval.toMillis()).toBe(1000);
    expect(res.timeEnd.toMillis() - res.timeStart.toMillis()).toBe(10000);
  });

  it('calculateTimelineByTotalDuration not exact', () => {
    const res = helper.calculateTimelineByTotalDuration({
      timeStart: DateTime.now(),
      total: Duration.fromMillis(10000),
      steps: 3n,
    });
    expect(res.interval.toMillis()).toBe(3333);
    expect(res.timeEnd.toMillis() - res.timeStart.toMillis()).toBe(9999);
  });

  it('calculateTimelineByTotalDuration short interval', () => {
    expect(() =>
      helper.calculateTimelineByTotalDuration({
        timeStart: DateTime.now(),
        total: Duration.fromMillis(10000),
        steps: 11n,
      }),
    ).toThrow(InvalidInputError);
  });
});
