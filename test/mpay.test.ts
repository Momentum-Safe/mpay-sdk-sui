import { SuiObjectChangeCreated, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { Backend } from '@/stream/backend';
import { CreateStreamHelper } from '@/transaction/builder/CreateStreamHelper';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { StreamEvent } from '@/types';

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
    const createResult = (await ts.wallet.signAndSubmitTransaction(txb)) as SuiTransactionBlockResponse;
    const streamIds = createResult
      .objectChanges!.filter(
        (change) =>
          change.type === 'created' && change.objectType.startsWith(`${ts.config.contract.contractId}::stream::Stream`),
      )
      .map((change) => (change as SuiObjectChangeCreated).objectId);

    const streamId = streamIds[0];

    // console.log(`created Stream [${streamIds}]`);

    const streamContract = new StreamContract(ts.config.contract, ts.globals);
    const setAutoClaimTxb = new TransactionBlock();
    streamContract.setAutoClaim(setAutoClaimTxb, {
      streamId,
      enabled: true,
      coinType: SUI_TYPE_ARG,
    });
    const setAutoClaimRes = (await ts.wallet.signAndSubmitTransaction(setAutoClaimTxb)) as SuiTransactionBlockResponse;
    // console.log('set auto claim: ', setAutoClaimRes.digest);

    await sleep(1500);

    const claimTxb = new TransactionBlock();
    streamContract.claimStream(claimTxb, {
      streamId,
      coinType: SUI_TYPE_ARG,
    });
    const claimResult = (await ts.wallet.signAndSubmitTransaction(claimTxb)) as SuiTransactionBlockResponse;

    // console.log('Claim stream:', claimResult.digest);

    await sleep(1500);
    const autoClaimTxb = new TransactionBlock();
    streamContract.claimStreamByProxy(autoClaimTxb, { streamId, coinType: SUI_TYPE_ARG });
    const autoClaimResult = (await ts.wallet.signAndSubmitTransaction(autoClaimTxb)) as SuiTransactionBlockResponse;

    // console.log('Auto claim: ', autoClaimResult.digest);

    const cancelTxb = new TransactionBlock();
    streamContract.cancelStream(cancelTxb, { streamId, coinType: SUI_TYPE_ARG });
    const cancelResult = (await ts.wallet.signAndSubmitTransaction(cancelTxb)) as SuiTransactionBlockResponse;
    // console.log('cancel stream', cancelResult.digest);
  });

  it('get streams', async () => {
    const env = newDevGlobals();
    const backend = new Backend(env.envConfig.backend!.url);
    const outStreams = await backend.getOutgoingStreams(
      '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
      {
        status: 'all',
      },
    );
    expect(outStreams.length > 0).toBe(true);
    expect(outStreams[0].streamId).not.toBeUndefined();
    expect(outStreams[0].groupId).not.toBeUndefined();
    expect(outStreams[0].sender).toBe('0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7');
    expect(outStreams[0].recipient).toBe('0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7');
    expect(outStreams[0].coinType).toBe('0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI');

    const inStreams = await backend.getIncomingStreams(
      '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    );
    expect(inStreams.length > 0).toBe(true);
    expect(inStreams[0].coinType).toBe('0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI');
    expect(outStreams[0].groupId).not.toBeUndefined();
    expect(inStreams[0].streamId).not.toBeUndefined();
    expect(inStreams[0].sender).toBe('0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7');
    expect(inStreams[0].recipient).toBe('0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7');

    const inactiveStreams = await backend.getOutgoingStreams(
      '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
      {
        status: 'inactive',
      },
    );
    expect(inactiveStreams.length > 0).toBe(true);
    expect(outStreams[0].groupId).not.toBeUndefined();
    expect(inStreams[0].streamId).not.toBeUndefined();
    expect(inStreams[0].sender).toBe('0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7');
    expect(inStreams[0].recipient).toBe('0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7');

    const events: any = await backend.getStreamHistory({});
    expect(events.data.length > 0).toBe(true);
    expect(events.data[0].txDigest).not.toBeUndefined();
    expect(events.data[0].streamId).not.toBeUndefined();
    expect(events.data[0].sender).not.toBeUndefined();

    expect(events.data[0].data.type).not.toBeUndefined();
    expect(events.data.filter((s: StreamEvent) => s.data.type !== 'set_auto_claim')[0].data.coinType).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    );
    expect(
      events.data.filter((s: StreamEvent) => s.data.type !== 'set_auto_claim')[0].data.balance,
    ).not.toBeUndefined();

    const coinTypes = await backend.getAllCoinTypes(
      '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    );
    expect(coinTypes.length > 0).toBe(true);
    expect(coinTypes[0]).toBe('0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI');
    const recipients = await backend.getAllRecipients(
      '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    );
    expect(recipients.length > 0).toBe(true);
    expect(recipients[0]).toBe('0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7');
    const sender = await backend.getAllSenders('0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7');
    expect(sender.length > 0).toBe(true);
    expect(sender[0]).toBe('0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7');
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
    const createResult = (await ts.wallet.signAndSubmitTransaction(txb)) as SuiTransactionBlockResponse;

    expect(createResult.effects?.status?.status).toBe('success');

    const streamIds = createResult
      .objectChanges!.filter(
        (change) =>
          change.type === 'created' && change.objectType.startsWith(`${ts.config.contract.contractId}::stream::Stream`),
      )
      .map((change) => (change as SuiObjectChangeCreated).objectId);

    const streamId = streamIds[0];

    // console.log(`created Stream [${streamIds}]`);

    const streamContract = new StreamContract(ts.config.contract, ts.globals);
    const setAutoClaimTxb = new TransactionBlock();

    streamContract.setAutoClaim(setAutoClaimTxb, {
      streamId,
      enabled: true,
      coinType: SUI_TYPE_ARG,
    });
    const setAutoClaimRes = (await ts.wallet.signAndSubmitTransaction(setAutoClaimTxb)) as SuiTransactionBlockResponse;
    // console.log('set auto claim: ', setAutoClaimRes.digest);

    await sleep(1500);

    const claimTxb = new TransactionBlock();
    streamContract.claimStream(claimTxb, {
      streamId,
      coinType: SUI_TYPE_ARG,
    });
    const claimResult = (await ts.wallet.signAndSubmitTransaction(claimTxb)) as SuiTransactionBlockResponse;

    // console.log('Claim stream:', claimResult.digest);

    await sleep(1500);
    const autoClaimTxb = new TransactionBlock();
    streamContract.claimStreamByProxy(autoClaimTxb, { streamId, coinType: SUI_TYPE_ARG });
    const autoClaimResult = (await ts.wallet.signAndSubmitTransaction(autoClaimTxb)) as SuiTransactionBlockResponse;

    // console.log('Auto claim: ', autoClaimResult.digest);

    const cancelTxb = new TransactionBlock();
    streamContract.cancelStream(cancelTxb, { streamId, coinType: SUI_TYPE_ARG });
    const cancelResult = (await ts.wallet.signAndSubmitTransaction(cancelTxb)) as SuiTransactionBlockResponse;
    // console.log('cancel stream', cancelResult.digest);
  });
});
