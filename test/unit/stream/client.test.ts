import { MPayHelper } from '@/stream/helper';
import { CLAIM_FEE_NUMERATOR, FEE_DENOMINATOR, FEE_NUMERATOR, FLAT_FEE_SUI } from '@/transaction/builder/const';
import { IPagedStreamListIterator, IStream, IStreamGroup } from '@/types';

import { newUnitGlobals } from '../../lib/setup';
import { defaultStreamParam } from '../../lib/stream';

// describe('MPayClient', () => {
//   let client: MPayClient;
//   const testAddress = '0xfa0f8542f256e669694624aa3ee7bfbde5af54641646a3a05924cf9e329a8a36';
//
//   beforeAll(() => {
//     client = new MPayClient(Env.dev);
//     client.connectSingleWallet(new FakeWallet(testAddress));
//   });
//
//   it('stream list', async () => {
//     const it = await client.getIncomingStreams();
//     const res = await getAllFromIter(it);
//     expect(res.length).not.toBe(0);
//   });
//
//   it('stream list with claimable set to true', async () => {
//     const it = await client.getIncomingStreams({
//       claimable: true,
//     });
//     const res = await getAllFromIter(it);
//     expect(res.length).toBeGreaterThan(0);
//     for (let i = 0; i !== res.length; i++) {
//       const st = res[i];
//       expect(st.progress.claimable).toBeGreaterThan(0);
//     }
//   });
//
//   it('Undefined claimable shall return all', async () => {
//     const it = await client.getIncomingStreams({
//       claimable: undefined,
//     });
//     const res = await getAllFromIter(it);
//     expect(res.length).toBeGreaterThan(0);
//   });
// });

describe('helper', () => {
  let helper: MPayHelper;

  beforeAll(() => {
    helper = new MPayHelper(newUnitGlobals());
  });

  it('calculateCreateStreamFees', () => {
    const fees = helper.calculateCreateStreamFees(defaultStreamParam('0x123'));
    expect(fees.flatFeeAmount).not.toBe(0n);
    expect(fees.streamFeeAmount).not.toBe(0n);
    expect(fees.streamFeeAmount).not.toBe(0n);
  });

  it('feeParams', () => {
    const feeParams = helper.feeParams();
    expect(feeParams.claimFeePercent.numerator).toBe(CLAIM_FEE_NUMERATOR);
    expect(feeParams.claimFeePercent.denominator).toBe(FEE_DENOMINATOR);
    expect(feeParams.createFeePercent.numerator).toBe(FEE_NUMERATOR);
    expect(feeParams.createFeePercent.denominator).toBe(FEE_DENOMINATOR);
    expect(feeParams.flatFeePerStream).toBe(FLAT_FEE_SUI);
  });
});

async function getAllFromIter(it: IPagedStreamListIterator) {
  const res: (IStream | IStreamGroup)[] = [];
  while (await it.hasNext()) {
    const page = await it.next();
    if (!page) {
      throw new Error('unexpected');
    }
    res.push(...page);
  }
  return res;
}
