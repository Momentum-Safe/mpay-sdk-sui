import { SuiTransactionBlockResponse, SuiObjectChangeCreated } from '@mysten/sui.js/client';

import { Stream } from '@/stream/stream';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamHelper } from '@/transaction/CreateStreamHelper';

import { getTestSuite, TestSuite } from '../../lib/setup';
import { defaultStreamParam } from '../../lib/stream';
import { sleep } from '../../lib/utils';

describe('stream', () => {
  let ts: TestSuite;

  beforeAll(async () => {
    ts = await getTestSuite();
  });

  async function createStream() {
    const builder = new CreateStreamHelper(
      ts.globals,
      new FeeContract(ts.globals.envConfig.contract, ts.globals),
      new StreamContract(ts.globals.envConfig.contract, ts.globals),
    );
    const createParams = defaultStreamParam(ts.address);
    const txb = await builder.buildCreateStreamTransactionBlock(createParams);
    const res = await ts.globals.wallet.execute(txb);
    const streamIds = (res as SuiTransactionBlockResponse)
      .objectChanges!.filter(
        (change) =>
          change.type === 'created' && change.objectType.startsWith(`${ts.config.contract.contractId}::stream::Stream`),
      )
      .map((change) => (change as SuiObjectChangeCreated).objectId);
    return streamIds[0];
  }

  it('newFromId', async () => {
    const stId = await createStream();
    const st = await Stream.new(ts.globals, stId);

    expect(st.info.name).toBe('test name');
    expect(st.info.groupId).toBeDefined();
  });

  it('claim', async () => {
    const stId = await createStream();
    const st = await Stream.new(ts.globals, stId);

    if (st.claimable === 0n) {
      await sleep(1000);
      await st.refresh();
    }
    expect(st.claimable).toBeGreaterThan(0n);
    const res = await st.claim();
    expect((res as SuiTransactionBlockResponse).effects?.status?.status).toBe('success');
    expect(st.progress.streamed).toBeGreaterThan(0n);
    expect(st.progress.status).toBe('STREAMING');
  });

  it('cancel', async () => {
    const stId = await createStream();
    const st = await Stream.new(ts.globals, stId);

    expect(st.cancelable).toBeTruthy();
    expect(st.progress.status).toBe('STREAMING');

    const res = await st.cancel();
    await st.refresh();
    expect((res as SuiTransactionBlockResponse).effects?.status?.status).toBe('success');

    expect(st.progress.status === 'CANCELED' || st.progress.status === 'SETTLED').toBeTruthy();
  });

  it('set auto claim and claim by proxy', async () => {
    const stId = await createStream();
    const st = await Stream.new(ts.globals, stId);

    expect(st.cancelable).toBeTruthy();
    expect(st.streamStatus).toBe('STREAMING');
    const res1 = await st.setAutoClaim(true);
    expect((res1 as SuiTransactionBlockResponse).effects?.status.status).toBe('success');
    expect(st.cancelable).toBeTruthy();

    if (st.claimable === 0n) {
      await sleep(1000);
      await st.refresh();
    }
    expect(st.claimable).toBeGreaterThan(0n);
    const res2 = await st.claimByProxy();
    expect((res2 as SuiTransactionBlockResponse).effects?.status?.status).toBe('success');
    expect(st.progress.streamed).toBeGreaterThan(0n);
    expect(st.progress.status).toBe('STREAMING');
  });
});
