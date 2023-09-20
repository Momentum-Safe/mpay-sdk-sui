import { SuiObjectChangeCreated, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { Backend } from '@/stream/backend';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamHelper } from '@/transaction/CreateStreamHelper';

import { getDevSuite, getTestSuite, newDevGlobals } from './lib/setup';
import { defaultStreamParam } from './lib/stream';
import { sleep } from './lib/utils';

describe('integration', () => {
  it('single stream creation', async () => {
    const ts = await getTestSuite();
    const builder = new CreateStreamHelper(
      ts.globals,
      new FeeContract(ts.config.contract, ts.globals),
      new StreamContract(ts.config.contract, ts.globals),
    );

    const streamParams = defaultStreamParam(ts.address);
    const txb = await builder.buildCreateStreamTransactionBlock(streamParams);
    const createResult = (await ts.globals.wallet.execute(txb)) as SuiTransactionBlockResponse;
    const streamIds = createResult
      .objectChanges!.filter(
        (change) =>
          change.type === 'created' && change.objectType.startsWith(`${ts.config.contract.contractId}::stream::Stream`),
      )
      .map((change) => (change as SuiObjectChangeCreated).objectId);

    const streamId = streamIds[0];

    console.log(`created Stream [${streamIds}]`);

    const streamContract = new StreamContract(ts.config.contract, ts.globals);
    const setAutoClaimTxb = new TransactionBlock();
    streamContract.setAutoClaim(setAutoClaimTxb, {
      streamId,
      enabled: true,
      coinType: SUI_TYPE_ARG,
    });
    const setAutoClaimRes = (await ts.wallet.execute(setAutoClaimTxb)) as SuiTransactionBlockResponse;
    console.log('set auto claim: ', setAutoClaimRes.digest);

    await sleep(1500);

    const claimTxb = new TransactionBlock();
    streamContract.claimStream(claimTxb, {
      streamId,
      coinType: SUI_TYPE_ARG,
    });
    const claimResult = (await ts.wallet.execute(claimTxb)) as SuiTransactionBlockResponse;

    console.log('Claim stream:', claimResult.digest);

    await sleep(1500);
    const autoClaimTxb = new TransactionBlock();
    streamContract.claimStreamByProxy(autoClaimTxb, { streamId, coinType: SUI_TYPE_ARG });
    const autoClaimResult = (await ts.wallet.execute(autoClaimTxb)) as SuiTransactionBlockResponse;

    console.log('Auto claim: ', autoClaimResult.digest);

    const cancelTxb = new TransactionBlock();
    streamContract.cancelStream(cancelTxb, { streamId, coinType: SUI_TYPE_ARG });
    const cancelResult = (await ts.wallet.execute(cancelTxb)) as SuiTransactionBlockResponse;
    console.log('cancel stream', cancelResult.digest);
  });

  it('get streams', async () => {
    const env = newDevGlobals();
    const backend = new Backend(env.envConfig.backend!.url);
    const outStreams = await backend.getOutgoingStreams(
      '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    );
    expect(outStreams.length > 0).toBe(true);
    expect(outStreams[0].coinType).toBe('0000000000000000000000000000000000000000000000000000000000000002::sui::SUI');

    const inStreams = await backend.getIncomingStreams(
      '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    );
    expect(inStreams.length > 0).toBe(true);
    expect(inStreams[0].coinType).toBe('0000000000000000000000000000000000000000000000000000000000000002::sui::SUI');

    const inactiveStreams = await backend.getOutgoingStreams(
      '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
      {
        status: 'inactive',
      },
    );
    expect(inactiveStreams.length > 0).toBe(true);

    const events = await backend.getStreamHistory({});
    expect(events.data.length > 0).toBe(true);

    const coinTypes = await backend.getAllCoinTypes(
      '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    );
    expect(coinTypes.length > 0).toBe(true);
    const recipients = await backend.getAllRecipients(
      '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    );
    expect(recipients.length > 0).toBe(true);
    const sender = await backend.getAllSenders('0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7');
    expect(sender.length > 0).toBe(true);
  });

  it('single stream creation on testNet', async () => {
    const ts = await getDevSuite('398a3013a139aba20fe11eaf60683fa5f39f98c52cfb415e2be5f71310c0c8a5');
    const builder = new CreateStreamHelper(
      ts.globals,
      new FeeContract(ts.config.contract, ts.globals),
      new StreamContract(ts.config.contract, ts.globals),
    );
    const streamParams = defaultStreamParam(ts.address);
    const txb = await builder.buildCreateStreamTransactionBlock(streamParams);
    const createResult = (await ts.globals.wallet.execute(txb)) as SuiTransactionBlockResponse;
    const streamIds = createResult
      .objectChanges!.filter(
        (change) =>
          change.type === 'created' && change.objectType.startsWith(`${ts.config.contract.contractId}::stream::Stream`),
      )
      .map((change) => (change as SuiObjectChangeCreated).objectId);

    const streamId = streamIds[0];

    console.log(`created Stream [${streamIds}]`);

    const streamContract = new StreamContract(ts.config.contract, ts.globals);
    const setAutoClaimTxb = new TransactionBlock();
    streamContract.setAutoClaim(setAutoClaimTxb, {
      streamId,
      enabled: true,
      coinType: SUI_TYPE_ARG,
    });
    const setAutoClaimRes = (await ts.wallet.execute(setAutoClaimTxb)) as SuiTransactionBlockResponse;
    console.log('set auto claim: ', setAutoClaimRes.digest);

    await sleep(1500);

    const claimTxb = new TransactionBlock();
    streamContract.claimStream(claimTxb, {
      streamId,
      coinType: SUI_TYPE_ARG,
    });
    const claimResult = (await ts.wallet.execute(claimTxb)) as SuiTransactionBlockResponse;

    console.log('Claim stream:', claimResult.digest);

    await sleep(1500);
    const autoClaimTxb = new TransactionBlock();
    streamContract.claimStreamByProxy(autoClaimTxb, { streamId, coinType: SUI_TYPE_ARG });
    const autoClaimResult = (await ts.wallet.execute(autoClaimTxb)) as SuiTransactionBlockResponse;

    console.log('Auto claim: ', autoClaimResult.digest);

    const cancelTxb = new TransactionBlock();
    streamContract.cancelStream(cancelTxb, { streamId, coinType: SUI_TYPE_ARG });
    const cancelResult = (await ts.wallet.execute(cancelTxb)) as SuiTransactionBlockResponse;
    console.log('cancel stream', cancelResult.digest);
  });
});
