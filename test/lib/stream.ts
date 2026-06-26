import { SUI_TYPE_ARG } from '@mysten/sui/utils';

import { Stream, StreamGroup } from '@/stream';
import { MPayHelper } from '@/stream/helper';
import { CreateStreamHelper } from '@/transaction/builder/CreateStreamHelper';
import { FeeContract } from '@/transaction/contracts/FeeContract';
import { StreamContract } from '@/transaction/contracts/StreamContract';
import { CreateStreamInfo, CreateStreamInfoInternal } from '@/types/client';

import { isSuccessfulTransaction } from '@/sui/adapters';

import { TestSuite } from './setup';
import { sleep } from './utils';

export type CreateStreamModifier = (info: CreateStreamInfoInternal) => CreateStreamInfoInternal;

/** Long interval so vesting/claim tests do not depend on wall-clock time. */
export const TEST_STREAM_EPOCH_INTERVAL = 3154000000000n;

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
  const txb = await builder.buildCreateStreamTransaction(createParams);
  const res = await ts.wallet.signAndSubmitTransaction(txb);
  const streamIds = new MPayHelper(ts.globals).getStreamIdsFromCreateStreamResponse(res);
  if (streamIds.length === 0) {
    throw new Error('Create stream transaction did not produce stream objects');
  }
  return streamIds;
}

export async function createStreamForTest(ts: TestSuite, recipient: string) {
  const stId = await createStreamHelper(ts, recipient, (info) => {
    info.recipients = [info.recipients[0]];
    info.epochInterval = TEST_STREAM_EPOCH_INTERVAL;
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
  if (!isSuccessfulTransaction(res)) {
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
    if (!isSuccessfulTransaction(res)) {
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
    info.epochInterval = TEST_STREAM_EPOCH_INTERVAL;
    return info;
  });
  const sg = await StreamGroup.new(ts.globals, stIds);
  const txb = await sg.streams[0].cancel();
  const res = await ts.wallet.signAndSubmitTransaction(txb);
  if (!isSuccessfulTransaction(res)) {
    throw new Error('Failed cancel stream');
  }
  await sg.refresh();
  return sg;
}

export function defaultStreamParamInternal(recipient: string): CreateStreamInfoInternal {
  const params = defaultStreamParam(recipient);
  return CreateStreamHelper.convertCreateStreamInfoToInternal(params);
}

/**
 * Minimal on-chain payment amounts for tests.
 * Note: contract flat fee (~0.1 SUI per stream recipient) dominates the cost, not these amounts.
 */
export function defaultStreamParam(recipient: string): CreateStreamInfo {
  return {
    name: 'test name',
    coinType: SUI_TYPE_ARG,
    recipients: [
      {
        address: recipient,
        cliffAmount: 100n,
        amountPerStep: 1n,
      },
    ],
    interval: 1000n,
    steps: 1n,
    startTimeMs: BigInt(new Date().getTime()),
    cancelable: true,
  };
}
