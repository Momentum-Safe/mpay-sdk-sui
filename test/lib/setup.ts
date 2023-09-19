import { Env, EnvConfig, getConfig } from '@/common/env';
import { Globals } from '@/common/globals';
import { IWallet } from '@/types/wallet';
import { SingleWalletAdapter } from '@/wallet/SingleWalletAdapter';

import { LocalWallet } from './wallet';

export interface TestSuite {
  globals: Globals;
  config: EnvConfig;
  wallet: IWallet;
  address: string;
}

export function newUnitGlobals() {
  return new Globals(getConfig(Env.unit));
}

export async function getTestSuite(): Promise<TestSuite> {
  const globals = newUnitGlobals();
  const testWallet = await setupTestWallet();
  const singleWallet = new SingleWalletAdapter(testWallet, globals.suiClient);
  globals.connectWallet(singleWallet);
  return {
    globals,
    config: globals.envConfig,
    wallet: singleWallet,
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
