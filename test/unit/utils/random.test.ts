import { generateGroupId } from '@/utils/random';

describe('generateGroupId', () => {
  it('randomness', () => {
    const set = new Set<string>();
    const randomTimes = 100;
    console.log(generateGroupId());
    for (let i = 0; i < randomTimes; i++) {
      set.add(generateGroupId());
    }
    expect(set.size).toEqual(randomTimes);
  });
});
