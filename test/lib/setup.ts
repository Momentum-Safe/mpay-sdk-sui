import { Env, EnvConfig, getConfig } from '@/common/env';
import { Globals } from '@/common/globals';
import { MSafeAccountAdapter } from '@/wallet';
import { SingleWalletAdapter } from '@/wallet/SingleWalletAdapter';

import { requestFaucetForTestnet } from './faucet';
import { FakeMSafeWallet, LocalWallet } from './wallet';

export interface TestSuite {
  globals: Globals;
  config: EnvConfig;
  wallet: LocalWallet;
  address: string;
}

export function newUnitGlobals() {
  return new Globals(getConfig(Env.local));
}

export async function getTestSuite(): Promise<TestSuite> {
  const { globals, testWallet } = await setupTestWallet();
  const singleWallet = new SingleWalletAdapter(testWallet, globals.suiClient);
  globals.connectWallet(singleWallet);
  return {
    globals,
    config: globals.envConfig,
    wallet: testWallet,
    address: await singleWallet.address(),
  };
}

export async function getTestSuiteWithFakeMSafe() {
  const { globals, testWallet } = await setupFakeMSafeWallet();
  const msafeWallet = new MSafeAccountAdapter(testWallet);
  globals.connectWallet(msafeWallet);
  return {
    globals,
    config: globals.envConfig,
    wallet: testWallet,
    address: await msafeWallet.address(),
  };
}

export async function setupTestWallet(): Promise<{ globals: Globals; testWallet: LocalWallet }> {
  const globals = newUnitGlobals();
  const wallet = new LocalWallet(globals.suiClient);
  const address = await wallet.address();
  await requestFaucetForTestnet(globals.suiClient, address);
  return {
    globals,
    testWallet: wallet,
  };
}

export async function setupFakeMSafeWallet() {
  const globals = newUnitGlobals();
  const wallet = new FakeMSafeWallet(globals.suiClient);
  const address = await wallet.address();
  await requestFaucetForTestnet(globals.suiClient, address);
  return {
    globals,
    testWallet: wallet,
  };
}
