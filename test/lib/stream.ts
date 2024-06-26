import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { Stream, StreamGroup } from '@/stream';
import { MPayHelper } from '@/stream/helper';
import { CreateStreamHelper } from '@/transaction/builder/CreateStreamHelper';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamInfo, CreateStreamInfoInternal } from '@/types/client';

import { TestSuite } from './setup';
import { sleep } from './utils';

export type CreateStreamModifier = (info: CreateStreamInfoInternal) => CreateStreamInfoInternal;

export async function createStreamHelper(ts: TestSuite, recipient: string, modifier?: CreateStreamModifier) {
  const builder = new CreateStreamHelper(
    ts.globals,
    new FeeContract(ts.globals.envConfig.contract, ts.globals),
    new StreamContract(ts.globals.envConfig.contract, ts.globals),
  );
  let createParams = defaultStreamParamInternal(recipient);
  if (modifier) {
    createParams = modifier(createParams);
  }
  const txb = await builder.buildCreateStreamTransactionBlock(createParams);
  const res = await ts.wallet.signAndSubmitTransaction(txb);
  return new MPayHelper(ts.globals).getStreamIdsFromCreateStreamResponse(res);
}

export async function createStreamForTest(ts: TestSuite, recipient: string) {
  const stId = await createStreamHelper(ts, recipient, (info) => {
    info.recipients = [info.recipients[0]];
    info.epochInterval = 3154000000000n;
    return info;
  });
  return Stream.new(ts.globals, stId[0]);
}

export async function createCanceledStream(ts: TestSuite, recipient: string) {
  const stId = await createStreamHelper(ts, recipient, (info) => {
    info.recipients = [info.recipients[0]];
    return info;
  });
  const st = await Stream.new(ts.globals, stId[0]);
  const txb = await st.cancel();
  const res = await ts.wallet.signAndSubmitTransaction(txb);
  if (res.effects?.status.status !== 'success') {
    throw new Error('Failed transaction canceled');
  }
  await st.refresh();
  return st;
}

export async function createSettledStream(ts: TestSuite, recipient: string) {
  const st = await createCanceledStream(ts, recipient);
  if (st.claimable === 0n) {
    await sleep(1000);
    await st.refresh();
  }
  if (st.claimable !== 0n) {
    const txb = await st.claim();
    const res = await ts.wallet.signAndSubmitTransaction(txb);
    if (res.effects?.status.status !== 'success') {
      throw new Error('Failed claim transaction');
    }
  }
  await st.refresh();
  return st;
}

export async function createStreamGroup(ts: TestSuite, recipients: string[]) {
  const stIds = await createStreamHelper(ts, recipients[0], (info) => {
    info.recipients = recipients.map((recipient) => ({
      ...info.recipients[0],
      address: recipient,
    }));
    info.epochInterval = 3154000000000n;
    return info;
  });
  const sg = await StreamGroup.new(ts.globals, stIds);
  // Cancel one stream from the stream group
  const txb = await sg.streams[0].cancel();
  const res = await ts.wallet.signAndSubmitTransaction(txb);
  if (res.effects?.status.status !== 'success') {
    throw new Error('Failed cancel stream');
  }
  await sg.refresh();
  return sg;
}

export function defaultStreamParamInternal(recipient: string): CreateStreamInfoInternal {
  const params = defaultStreamParam(recipient);
  return CreateStreamHelper.convertCreateStreamInfoToInternal(params);
}

export function defaultStreamParam(recipient: string): CreateStreamInfo {
  return {
    name: 'test name',
    coinType: SUI_TYPE_ARG,
    recipients: [
      {
        address: recipient,
        cliffAmount: 10000n,
        amountPerStep: 100n,
      },
      {
        address: recipient,
        cliffAmount: 5000n,
        amountPerStep: 1000n,
      },
    ],
    interval: 1000n,
    steps: 100n,
    startTimeMs: BigInt(new Date().getTime()),
    cancelable: true,
  };
}
