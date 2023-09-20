import { SuiObjectChangeCreated, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { encodeMetadata } from '@/stream/metadata';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamHelper } from '@/transaction/CreateStreamHelper';
import { CreateStreamInfoInternal } from '@/types/client';

import { TestSuite } from './setup';

export type CreateStreamModifier = (info: CreateStreamInfoInternal) => CreateStreamInfoInternal;

export async function createStreamHelper(ts: TestSuite, recipient: string, modifier?: CreateStreamModifier) {
  const builder = new CreateStreamHelper(
    ts.globals,
    new FeeContract(ts.globals.envConfig.contract, ts.globals),
    new StreamContract(ts.globals.envConfig.contract, ts.globals),
  );
  let createParams = defaultStreamParam(ts.address);
  if (modifier) {
    createParams = modifier(createParams);
  }
  const txb = await builder.buildCreateStreamTransactionBlock(createParams);
  const res = await ts.globals.wallet.execute(txb);
  const streamIds = (res as SuiTransactionBlockResponse)
    .objectChanges!.filter(
      (change) =>
        change.type === 'created' && change.objectType.startsWith(`${ts.config.contract.contractId}::stream::Stream`),
    )
    .map((change) => (change as SuiObjectChangeCreated).objectId);
  return streamIds;
}

export function defaultStreamParam(recipient: string): CreateStreamInfoInternal {
  const metadata = encodeMetadata({
    name: 'test name',
    groupId: Date.now().toString(),
  });
  return {
    metadata,
    coinType: SUI_TYPE_ARG,
    recipients: [
      {
        address: recipient,
        cliffAmount: 10000n,
        amountPerEpoch: 5000n,
      },
      {
        address: recipient,
        cliffAmount: 5000n,
        amountPerEpoch: 1000n,
      },
    ],
    epochInterval: 1000n,
    numberEpoch: 100n,
    startTime: BigInt(new Date().getTime()),
    cancelable: true,
  };
}
