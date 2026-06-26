/** Run integration tests that bootstrap shared chain fixtures first. */
const CHAIN_TEST_ORDER = [
  'test/mpay.test.ts',
  'test/unit/transaction/decoder.test.ts',
  'test/unit/stream/Stream.test.ts',
  'test/unit/stream/StreamGroup.test.ts',
  'test/unit/stream/query.test.ts',
];

class ChainFirstSequencer {
  sort(tests) {
    const rank = (testPath) => {
      const entry = CHAIN_TEST_ORDER.find((suffix) => testPath.endsWith(suffix));
      return entry ? CHAIN_TEST_ORDER.indexOf(entry) : Number.MAX_SAFE_INTEGER;
    };
    return [...tests].sort((a, b) => {
      const aRank = rank(a.path);
      const bRank = rank(b.path);
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      return a.path.localeCompare(b.path);
    });
  }

  cacheKey(tests) {
    return tests.map((test) => test.path).join(':');
  }

  allTestsCompleted() {
    return true;
  }
}

module.exports = ChainFirstSequencer;
