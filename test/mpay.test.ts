import { SuiObjectChangeCreated, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamBuilder } from '@/transaction/CreateStreamBuilder';
import { generateGroupId } from '@/utils/random';

import { getTestSuite } from './lib/setup';
import { sleep } from './lib/utils';

describe('integration', () => {
  it('single stream creation', async () => {
    const ts = await getTestSuite();
    const builder = new CreateStreamBuilder(ts.globals, ts.config.contract);

    const metadata = `{'groupId': '${generateGroupId()}', 'name': 'test'}`;
    const txb = await builder.buildCreateStreamTransactionBlock({
      metadata,
      coinType: SUI_TYPE_ARG,
      recipients: [
        {
          address: ts.address,
          cliffAmount: 10000n,
          amountPerEpoch: 5000n,
        },
        {
          address: ts.address,
          cliffAmount: 5000n,
          amountPerEpoch: 1000n,
        },
      ],
      epochInterval: 1000n,
      numberEpoch: 100n,
      startTime: BigInt(new Date().getTime()),
      cancelable: true,
    });
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
      streamID: streamId,
      enabled: true,
      coinType: SUI_TYPE_ARG,
    });
    const setAutoClaimRes = (await ts.wallet.execute(setAutoClaimTxb)) as SuiTransactionBlockResponse;
    console.log('set auto claim: ', setAutoClaimRes.digest);

    await sleep(1500);

    const claimTxb = new TransactionBlock();
    streamContract.claimStream(claimTxb, {
      streamID: streamId,
      coinType: SUI_TYPE_ARG,
    });
    const claimResult = (await ts.wallet.execute(claimTxb)) as SuiTransactionBlockResponse;

    console.log('Claim stream:', claimResult.digest);

    await sleep(1500);
    const autoClaimTxb = new TransactionBlock();
    streamContract.claimStreamByProxy(autoClaimTxb, { streamID: streamId, coinType: SUI_TYPE_ARG });
    const autoClaimResult = (await ts.wallet.execute(autoClaimTxb)) as SuiTransactionBlockResponse;

    console.log('Auto claim: ', autoClaimResult.digest);

    const cancelTxb = new TransactionBlock();
    streamContract.cancelStream(cancelTxb, { streamID: streamId, coinType: SUI_TYPE_ARG });
    const cancelResult = (await ts.wallet.execute(cancelTxb)) as SuiTransactionBlockResponse;
    console.log('cancel stream', cancelResult.digest);
  });
});
