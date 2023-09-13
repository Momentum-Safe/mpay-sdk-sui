import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { CreateStreamBuilder } from '@/transaction/CreateStreamBuilder';
import { generateGroupId } from '@/utils/random';

import { getTestSuite, TestSuite } from '../../lib/setup';

describe('builder', () => {
  let testSuite: TestSuite;
  let builder: CreateStreamBuilder;

  beforeAll(async () => {
    testSuite = await getTestSuite();
    builder = new CreateStreamBuilder(testSuite.globals, testSuite.config.contract);
  });

  it('calculate fee', async () => {
    const testFeeWithAmount = async (amount: bigint) => {
      const feeRemote = await builder.getStreamFeeRemote(amount);
      const feeLocal = builder.getStreamFeeLocal(amount);
      expect(feeRemote).toBe(feeLocal);
    };

    await testFeeWithAmount(10000n);
    await testFeeWithAmount(12345n);
    await testFeeWithAmount(10n);
    await testFeeWithAmount(123567n);
    await testFeeWithAmount(1000000000012345n);
  });

  it('createStream', async () => {
    const gid = generateGroupId();
    const txb = await builder.buildCreateStreamTransactionBlock({
      metadata: `{'groupId': '${gid}', 'name': 'test'}`,
      coinType: SUI_TYPE_ARG,
      recipients: [
        {
          address: testSuite.address,
          cliffAmount: 10000n,
          amountPerEpoch: 5000n,
        },
      ],
      epochInterval: 50000n,
      numberEpoch: 10n,
      startTime: BigInt(new Date().getTime()),
      cancelable: true,
    });
    const res = await testSuite.globals.wallet.execute(txb);
    console.log(res);
  });
});
