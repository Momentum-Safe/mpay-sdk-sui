import { SuiTransactionBlockResponse } from '@mysten/sui.js/client';

import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamHelper } from '@/transaction/CreateStreamHelper';
import { IStream, IStreamGroup, IStreamListIterator } from '@/types';

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

async function testStreamListIteration(it: IStreamListIterator, expStreamNumber: number[]) {
  for (let i = 0; i !== expStreamNumber.length; i++) {
    expect(await it.hasNext()).toBeTruthy();
    const st = await it.next();
    expect(st).toBeDefined();
    if (expStreamNumber[i] === 1) {
      expect('streamId' in (st as IStream | IStreamGroup)).toBeTruthy();
    } else {
      expect('streams' in (st as IStream | IStreamGroup)).toBeTruthy();
      expect((st as IStreamGroup).streams.length).toBe(expStreamNumber[i]);
    }
  }
  expect(await it.hasNext()).toBeFalsy();
}
