import { Stream, StreamGroup } from '@/stream';

import { getTestSuite, TestSuite } from './setup';
import { createStreamHelper, TEST_STREAM_EPOCH_INTERVAL } from './stream';
import { sleep } from './utils';

export interface ChainFixtures {
  walletAddress: string;
  activeStreamId: string;
  /** Uncanceled stream used by Stream.test cancel case */
  pendingCancelStreamId: string;
  groupStreamIds: string[];
  canceledStreamId: string;
  settledStreamId: string;
}

let fixturesPromise: Promise<{ ts: TestSuite; fixtures: ChainFixtures }> | undefined;

async function buildChainFixtures(ts: TestSuite): Promise<ChainFixtures> {
  console.log('[test] Creating shared chain fixtures (one-time per run)...');
  await sleep(2000);

  // One tx, two recipients (~0.2 SUI flat fee). Cancel the second for query "canceled" fixture.
  const groupStreamIds = await createStreamHelper(ts, ts.address, (info) => ({
    ...info,
    recipients: [info.recipients[0], info.recipients[0]],
    epochInterval: TEST_STREAM_EPOCH_INTERVAL,
  }));
  const group = await StreamGroup.new(ts.globals, groupStreamIds);
  await ts.wallet.signAndSubmitTransaction(await group.streams[1].cancel());
  await sleep(1000);

  const [activeStreamId] = await createStreamHelper(ts, ts.address, (info) => ({
    ...info,
    epochInterval: TEST_STREAM_EPOCH_INTERVAL,
  }));

  const [pendingCancelStreamId] = await createStreamHelper(ts, ts.address, (info) => ({
    ...info,
    epochInterval: TEST_STREAM_EPOCH_INTERVAL,
  }));

  const [settledTargetId] = await createStreamHelper(ts, ts.address, (info) => ({
    ...info,
    epochInterval: TEST_STREAM_EPOCH_INTERVAL,
  }));
  const settledTarget = await Stream.new(ts.globals, settledTargetId);
  await ts.wallet.signAndSubmitTransaction(await settledTarget.cancel());
  await sleep(1000);
  await settledTarget.refresh();
  if (settledTarget.claimable > 0n) {
    await ts.wallet.signAndSubmitTransaction(await settledTarget.claim());
    await settledTarget.refresh();
  }

  console.log('[test] Chain fixtures ready');
  return {
    walletAddress: ts.address,
    activeStreamId,
    pendingCancelStreamId,
    groupStreamIds,
    canceledStreamId: groupStreamIds[1],
    settledStreamId: settledTarget.streamId,
  };
}

/** Lazily create on-chain streams once per test run and share across integration tests. */
export async function getChainFixtures(): Promise<{ ts: TestSuite; fixtures: ChainFixtures }> {
  if (!fixturesPromise) {
    fixturesPromise = (async () => {
      const ts = await getTestSuite();
      const fixtures = await buildChainFixtures(ts);
      return { ts, fixtures };
    })();
  }
  return fixturesPromise;
}

export async function getActiveStream() {
  const { ts, fixtures } = await getChainFixtures();
  return { ts, stream: await Stream.new(ts.globals, fixtures.activeStreamId) };
}

export async function getPendingCancelStream() {
  const { ts, fixtures } = await getChainFixtures();
  return { ts, stream: await Stream.new(ts.globals, fixtures.pendingCancelStreamId) };
}

export async function getGroupStreams() {
  const { ts, fixtures } = await getChainFixtures();
  return { ts, group: await StreamGroup.new(ts.globals, fixtures.groupStreamIds) };
}

export async function getCanceledStream() {
  const { ts, fixtures } = await getChainFixtures();
  return { ts, stream: await Stream.new(ts.globals, fixtures.canceledStreamId) };
}

export async function getSettledStream() {
  const { ts, fixtures } = await getChainFixtures();
  return { ts, stream: await Stream.new(ts.globals, fixtures.settledStreamId) };
}

export function resetChainFixtures() {
  fixturesPromise = undefined;
}
