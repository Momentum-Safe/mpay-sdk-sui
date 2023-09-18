import { DateTime } from 'luxon';

import { roundDateTime, TIME_ROUND_UNIT } from '@/utils/utils';

describe('round time', () => {
  it('round', () => {
    const d = DateTime.fromMillis(1694732143567);
    const rounded = roundDateTime(d);
    expect(rounded.valueOf() % TIME_ROUND_UNIT).toBe(0);
  });
});
