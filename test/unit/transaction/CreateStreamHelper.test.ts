import { SuiTransactionBlockResponse } from '@mysten/sui.js/client';

import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamHelper } from '@/transaction/CreateStreamHelper';

import { getTestSuite, TestSuite } from '../../lib/setup';
import { defaultStreamParam } from '../../lib/stream';

describe('builder', () => {
  let testSuite: TestSuite;
  let builder: CreateStreamHelper;

  beforeAll(async () => {
    testSuite = await getTestSuite();
    builder = new CreateStreamHelper(
      testSuite.globals,
      new FeeContract(testSuite.globals.envConfig.contract, testSuite.globals),
      new StreamContract(testSuite.globals.envConfig.contract, testSuite.globals),
    );
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
    const txb = await builder.buildCreateStreamTransactionBlock(defaultStreamParam(testSuite.address));
    const res = await testSuite.wallet.signAndSubmitTransaction(txb);
    expect((res as SuiTransactionBlockResponse).errors).toBeUndefined();
    expect((res as SuiTransactionBlockResponse).effects!.status.status).toBe('success');
  });
});
