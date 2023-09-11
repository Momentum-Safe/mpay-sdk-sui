import { EntryIterator, PagedIterator, SuiIterator } from '@/sui/iterator/iterator';
import { PagedData, Requester } from '@/sui/iterator/requester';

describe('PagedIterator', () => {
  it('simple', () => {
    const testData = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    const req = new TestRequester(testData);
    const iter = new PagedIterator(req);

    testIterator(iter, {
      numIteration: 3,
      checkResult: (res, i) => req.checkPagedResult(res, i),
    });
  });

  it('simple with trailing', () => {
    const testData = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]];
    const req = new TestRequester(testData);
    const iter = new PagedIterator(req);

    testIterator(iter, {
      numIteration: 4,
      checkResult: (res, i) => req.checkPagedResult(res, i),
    });
  });

  it('empty', () => {
    const testData: number[][] = [];
    const req = new TestRequester(testData);
    const iter = new PagedIterator(req);

    testIterator(iter, {
      numIteration: 0,
      checkResult: (res, i) => req.checkPagedResult(res, i),
    });
  });

  it('empty first', () => {
    const testData: number[][] = [[], [], [1, 2, 3]];
    const req = new TestRequester(testData);
    const iter = new PagedIterator(req);

    testIterator(iter, {
      numIteration: 3,
      checkResult: (res, i) => req.checkPagedResult(res, i),
    });
  });
});

describe('PagedIterator', () => {
  it('simple', () => {
    const testData = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    const req = new TestRequester(testData);
    const iter = new EntryIterator(req);

    testIterator(iter, {
      numIteration: 9,
      checkResult: (res, i) => req.checkEntryResult(res, i),
    });
  });

  it('trailing', () => {
    const testData = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]];
    const req = new TestRequester(testData);
    const iter = new EntryIterator(req);

    testIterator(iter, {
      numIteration: 10,
      checkResult: (res, i) => req.checkEntryResult(res, i),
    });
  });

  it('empty', () => {
    const testData: number[][] = [];
    const req = new TestRequester(testData);
    const iter = new EntryIterator(req);

    testIterator(iter, {
      numIteration: 0,
      checkResult: (res, i) => req.checkEntryResult(res, i),
    });
  });

  it('first empty', () => {
    const testData: number[][] = [[], [], [1, 2, 3]];
    const req = new TestRequester(testData);
    const iter = new EntryIterator(req);

    testIterator(iter, {
      numIteration: 3,
      checkResult: (res, i) => req.checkEntryResult(res, i),
    });
  });
});

class TestRequester implements Requester<number> {
  curIndex: number;

  constructor(public readonly data: number[][]) {
    this.curIndex = -1;
  }

  async doNextRequest(): Promise<PagedData<number>> {
    if (this.curIndex === -1 && !this.data.length) {
      this.curIndex += 1;
      return { data: [], hasNext: false };
    }
    this.curIndex += 1;
    if (this.curIndex >= this.data.length) {
      throw new Error('out of bound');
    }
    return {
      data: this.data[this.curIndex],
      hasNext: this.curIndex < this.data.length - 1,
    };
  }

  checkPagedResult(res: (number | undefined)[] | undefined, numIter: number) {
    const exp = this.data[numIter];
    expect(res).toEqual(exp);
  }

  checkEntryResult(res: number | undefined, numIter: number) {
    const exp = this.data.flat(1)[numIter];
    expect(res).toEqual(exp);
  }
}

export async function testIterator<T>(
  iter: SuiIterator<T>,
  exp: {
    numIteration: number;
    checkResult?: (res: T | undefined, i: number) => void;
  },
) {
  let numIter = 0;
  while (await iter.hasNext()) {
    const res: T | undefined = await iter.next();
    if (exp.checkResult) {
      exp.checkResult(res, numIter);
    }
    numIter += 1;
  }
  expect(numIter).toBe(exp.numIteration);
}
