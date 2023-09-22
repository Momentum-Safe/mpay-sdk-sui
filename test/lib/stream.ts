import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { MPayHelper } from '@/stream/helper';
import { encodeMetadata } from '@/stream/metadata';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamHelper } from '@/transaction/CreateStreamHelper';
import { CreateStreamInfoInternal } from '@/types/client';
import { generateGroupId } from '@/utils/random';

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
  const res = await ts.wallet.signAndSubmitTransaction(txb);
  return new MPayHelper(ts.globals).getStreamIdsFromCreateStreamResponse(res);
}

export function defaultStreamParam(recipient: string): CreateStreamInfoInternal {
  const metadata = encodeMetadata({
    name: 'test name',
    groupId: generateGroupId(),
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
