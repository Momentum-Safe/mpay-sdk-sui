import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { Env, EnvConfig } from '@/common/env';
import { Globals } from '@/common/globals';
import { MSafeAccountAdapter } from '@/wallet';
import { SingleWalletAdapter } from '@/wallet/SingleWalletAdapter';

import { FakeMSafeWallet, LocalWallet } from './wallet';

const TEST_WALLET_CACHE_FILE = join(process.cwd(), '.jest-cache', 'test-wallet.json');

interface CachedTestWallet {
  secretKey: string;
  address: string;
}

function readCachedTestWallet(): CachedTestWallet | null {
  if (!existsSync(TEST_WALLET_CACHE_FILE)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(TEST_WALLET_CACHE_FILE, 'utf8')) as CachedTestWallet;
  } catch {
    return null;
  }
}

export interface TestSuite {
  globals: Globals;
  config: EnvConfig;
  wallet: LocalWallet;
  address: string;
}

interface SharedTestContext {
  globals: Globals;
  wallet: LocalWallet;
  address: string;
  secretKey: string;
}

let sharedContextPromise: Promise<SharedTestContext> | undefined;

export function newUnitGlobals() {
  const base = Globals.new(Env.local);
  return new Globals(base.envConfig, base.suiClient);
}

/** Reset shared wallet state between Jest workers or manual test runs. */
export function resetSharedTestContext() {
  sharedContextPromise = undefined;
}

async function createSharedTestContext(): Promise<SharedTestContext> {
  const cached = readCachedTestWallet();
  if (!cached) {
    throw new Error('Missing test wallet cache. globalSetup should run before integration tests.');
  }
  const globals = Globals.new(Env.local);
  const wallet = new LocalWallet(globals.suiClient, cached.secretKey);
  const address = cached.address;

  return { globals, wallet, address, secretKey: cached.secretKey };
}

async function getSharedTestContext(): Promise<SharedTestContext> {
  if (!sharedContextPromise) {
    sharedContextPromise = createSharedTestContext();
  }
  return sharedContextPromise;
}

function createTestGlobals(ctx: SharedTestContext) {
  return new Globals(ctx.globals.envConfig, ctx.globals.suiClient);
}

export async function getTestSuite(): Promise<TestSuite> {
  const ctx = await getSharedTestContext();
  const globals = createTestGlobals(ctx);
  const singleWallet = new SingleWalletAdapter(ctx.wallet, ctx.globals.suiClient);
  globals.connectWallet(singleWallet);
  return {
    globals,
    config: globals.envConfig,
    wallet: ctx.wallet,
    address: ctx.address,
  };
}

export async function getTestSuiteWithFakeMSafe(): Promise<TestSuite> {
  const ctx = await getSharedTestContext();
  const globals = createTestGlobals(ctx);
  const fakeMsafe = new FakeMSafeWallet(ctx.globals.suiClient, ctx.secretKey);
  const msafeWallet = new MSafeAccountAdapter(fakeMsafe);
  globals.connectWallet(msafeWallet);
  return {
    globals,
    config: globals.envConfig,
    wallet: fakeMsafe,
    address: ctx.address,
  };
}

export async function setupTestWallet(): Promise<{ globals: Globals; testWallet: LocalWallet }> {
  const ctx = await getSharedTestContext();
  return {
    globals: createTestGlobals(ctx),
    testWallet: ctx.wallet,
  };
}

export async function setupFakeMSafeWallet(): Promise<{ globals: Globals; testWallet: FakeMSafeWallet }> {
  const ctx = await getSharedTestContext();
  return {
    globals: createTestGlobals(ctx),
    testWallet: new FakeMSafeWallet(ctx.globals.suiClient, ctx.secretKey),
  };
}
