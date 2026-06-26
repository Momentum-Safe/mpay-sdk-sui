import { FaucetRateLimitError, getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_TYPE_ARG } from '@mysten/sui/utils';
import { backOff } from 'exponential-backoff';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/** Preferred balance before chain tests; top-up only when below this and faucet is available. */
export const MIN_TEST_SUI_BALANCE = 600_000_000n;

/** Minimum balance to run chain tests without calling the faucet. */
export const MIN_RUN_SUI_BALANCE = 200_000_000n;

const COLLECTOR_GAS_RESERVE = 50_000_000n;
const TESTNET_GRPC_URL = 'https://fullnode.testnet.sui.io:443';
const CACHE_DIR = join(process.cwd(), '.jest-cache');
const COLLECTOR_CACHE_FILE = join(CACHE_DIR, 'faucet-collector.json');
const TEST_WALLET_CACHE_FILE = join(CACHE_DIR, 'test-wallet.json');

export type TestnetClient = SuiGrpcClient;

export interface CachedWallet {
  secretKey: string;
  address: string;
}

export function createTestnetClient(): TestnetClient {
  return new SuiGrpcClient({
    baseUrl: TESTNET_GRPC_URL,
    network: 'testnet',
  });
}

function readCachedWallet(path: string): CachedWallet | null {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as CachedWallet;
  } catch {
    return null;
  }
}

function writeCachedWallet(path: string, wallet: CachedWallet) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(path, JSON.stringify(wallet));
}

function loadOrCreateWallet(path: string): CachedWallet {
  const cached = readCachedWallet(path);
  if (cached) {
    return cached;
  }
  const kp = new Ed25519Keypair();
  const wallet = { secretKey: kp.getSecretKey(), address: kp.toSuiAddress() };
  writeCachedWallet(path, wallet);
  return wallet;
}

export async function getSuiTotalBalance(client: TestnetClient, owner: string): Promise<bigint> {
  let cursor: string | null | undefined;
  let total = 0n;

  do {
    const res = await client.listCoins({
      owner,
      coinType: SUI_TYPE_ARG,
      cursor,
      limit: 50,
    });
    for (const coin of res.objects) {
      total += BigInt(coin.balance);
    }
    cursor = res.hasNextPage ? res.cursor : null;
  } while (cursor);

  return total;
}

export async function requestFaucetWithRetry(recipient: string) {
  return backOff(
    async () => {
      const res = await requestSuiFromFaucetV2({
        host: getFaucetHost('testnet'),
        recipient,
      });
      if (res.status !== 'Success') {
        throw new Error(`Unexpected faucet response: ${JSON.stringify(res.status)}`);
      }
      return res;
    },
    {
      numOfAttempts: 4,
      maxDelay: 10_000,
      startingDelay: 2_000,
      retry: (error) =>
        error instanceof FaucetRateLimitError ||
        (error instanceof Error && /too many requests|rate limit/i.test(error.message)),
    },
  );
}

async function waitForBalanceIncrease(client: TestnetClient, owner: string, previousBalance: bigint) {
  return backOff(
    async () => {
      const balance = await getSuiTotalBalance(client, owner);
      if (balance <= previousBalance) {
        throw new Error(`Balance not updated yet (${balance} MIST)`);
      }
      return balance;
    },
    {
      numOfAttempts: 20,
      maxDelay: 5_000,
      startingDelay: 500,
    },
  );
}

async function transferSui(client: TestnetClient, from: Ed25519Keypair, to: string, amount: bigint) {
  const tx = new Transaction();
  tx.setSender(from.toSuiAddress());
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  tx.transferObjects([coin], to);
  await client.signAndExecuteTransaction({
    transaction: tx,
    signer: from,
  });
}

async function faucetCollectorOnce(client: TestnetClient, collector: CachedWallet) {
  const before = await getSuiTotalBalance(client, collector.address);
  if (before >= MIN_RUN_SUI_BALANCE) {
    return before;
  }

  console.log(`[globalSetup] Faucet collector ${collector.address} requesting once...`);
  await requestFaucetWithRetry(collector.address);
  const after = await waitForBalanceIncrease(client, collector.address, before);
  console.log(`[globalSetup] Collector balance ${after} MIST`);
  return after;
}

async function topUpTestWalletFromCollector(
  client: TestnetClient,
  collector: CachedWallet,
  testWallet: CachedWallet,
) {
  let testBalance = await getSuiTotalBalance(client, testWallet.address);
  if (testBalance >= MIN_TEST_SUI_BALANCE) {
    console.log(`[globalSetup] Test wallet ${testWallet.address} ready (${testBalance} MIST)`);
    return testBalance;
  }

  if (testBalance >= MIN_RUN_SUI_BALANCE) {
    console.log(
      `[globalSetup] Test wallet ${testWallet.address} has ${testBalance} MIST (skipping faucet top-up)`,
    );
    return testBalance;
  }

  const needed = MIN_TEST_SUI_BALANCE - testBalance;
  let collectorBalance = await getSuiTotalBalance(client, collector.address);

  if (collectorBalance > COLLECTOR_GAS_RESERVE) {
    const transferable = collectorBalance - COLLECTOR_GAS_RESERVE;
    const amount = transferable >= needed ? needed : transferable;
    console.log(`[globalSetup] Transfer ${amount} MIST: collector -> test wallet ${testWallet.address}`);
    const collectorKp = Ed25519Keypair.fromSecretKey(collector.secretKey);
    await transferSui(client, collectorKp, testWallet.address, amount);
    testBalance = await waitForBalanceIncrease(client, testWallet.address, testBalance);
    if (testBalance >= MIN_RUN_SUI_BALANCE) {
      console.log(`[globalSetup] Test wallet balance ${testBalance} MIST`);
      return testBalance;
    }
    collectorBalance = await getSuiTotalBalance(client, collector.address);
  }

  if (collectorBalance < needed + COLLECTOR_GAS_RESERVE) {
    try {
      collectorBalance = await faucetCollectorOnce(client, collector);
    } catch (error) {
      if (testBalance > 0n) {
        console.warn(
          `[globalSetup] Faucet unavailable (${error instanceof Error ? error.message : error}); ` +
            `continuing with ${testBalance} MIST`,
        );
        return testBalance;
      }
      throw error;
    }
  }

  const transferable = collectorBalance - COLLECTOR_GAS_RESERVE;
  if (transferable <= 0n) {
    if (testBalance > 0n) {
      console.warn(`[globalSetup] Collector empty; continuing with ${testBalance} MIST`);
      return testBalance;
    }
    throw new Error('Collector wallet has no transferable SUI');
  }

  const amount = transferable >= needed ? needed : transferable;
  console.log(`[globalSetup] Transfer ${amount} MIST: collector -> test wallet ${testWallet.address}`);
  const collectorKp = Ed25519Keypair.fromSecretKey(collector.secretKey);
  await transferSui(client, collectorKp, testWallet.address, amount);
  return waitForBalanceIncrease(client, testWallet.address, testBalance);
}

export async function ensureTestWalletsReady(): Promise<CachedWallet> {
  const client = createTestnetClient();
  const envKey = process.env.TEST_WALLET_PRIVATE_KEY;

  if (envKey) {
    const kp = Ed25519Keypair.fromSecretKey(envKey);
    const testWallet = { secretKey: envKey, address: kp.toSuiAddress() };
    writeCachedWallet(TEST_WALLET_CACHE_FILE, testWallet);
    await topUpTestWalletFromCollector(client, loadOrCreateWallet(COLLECTOR_CACHE_FILE), testWallet);
    return testWallet;
  }

  const collector = loadOrCreateWallet(COLLECTOR_CACHE_FILE);
  const testWallet = loadOrCreateWallet(TEST_WALLET_CACHE_FILE);
  await topUpTestWalletFromCollector(client, collector, testWallet);
  return testWallet;
}

export async function requestFaucetForTestnet(client: TestnetClient, recipient: string) {
  const collector = loadOrCreateWallet(COLLECTOR_CACHE_FILE);
  const testWallet = readCachedWallet(TEST_WALLET_CACHE_FILE);
  if (testWallet && testWallet.address === recipient) {
    await topUpTestWalletFromCollector(client, collector, testWallet);
    return;
  }
  const before = await getSuiTotalBalance(client, recipient);
  await requestFaucetWithRetry(recipient);
  await waitForBalanceIncrease(client, recipient, before);
}
