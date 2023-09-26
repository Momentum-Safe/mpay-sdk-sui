import { Env, EnvConfig, getConfig } from '@/common/env';
import { Globals } from '@/common/globals';
import { SingleWalletAdapter } from '@/wallet/SingleWalletAdapter';

import { LocalWallet } from './wallet';

export interface TestSuite {
  globals: Globals;
  config: EnvConfig;
  wallet: LocalWallet;
  address: string;
}

export function newUnitGlobals() {
  return new Globals(getConfig(Env.unit));
}

export function newDevGlobals() {
  return new Globals(getConfig(Env.dev));
}

export async function getDevSuite(privateKey: string): Promise<TestSuite> {
  const globals = newDevGlobals();
  const wallet = new LocalWallet(globals.suiClient, privateKey);
  const singleWallet = new SingleWalletAdapter(wallet, globals.suiClient);
  globals.connectWallet(singleWallet);
  return {
    globals,
    config: globals.envConfig,
    wallet,
    address: await singleWallet.address(),
  };
}

export async function getTestSuite(): Promise<TestSuite> {
  const globals = newUnitGlobals();
  const testWallet = await setupTestWallet();
  const singleWallet = new SingleWalletAdapter(testWallet, globals.suiClient);
  globals.connectWallet(singleWallet);
  return {
    globals,
    config: globals.envConfig,
    wallet: testWallet,
    address: await singleWallet.address(),
  };
}

export async function setupTestWallet() {
  const globals = newUnitGlobals();
  const wallet = new LocalWallet(globals.suiClient);
  const address = await wallet.address();
  await globals.requestFaucet(address);
  return wallet;
}
