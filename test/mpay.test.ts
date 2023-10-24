import { SuiObjectChangeCreated, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { CreateStreamHelper } from '@/transaction/builder/CreateStreamHelper';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';

import { getTestSuite } from './lib/setup';
import { defaultStreamParamInternal } from './lib/stream';
import { sleep } from './lib/utils';

describe('integration', () => {
  it('single stream creation', async () => {
    const ts = await getTestSuite();
    const builder = new CreateStreamHelper(
      ts.globals,
      new FeeContract(ts.config.contract, ts.globals),
      new StreamContract(ts.config.contract, ts.globals),
    );

    const streamParams = defaultStreamParamInternal(ts.address);
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
});
