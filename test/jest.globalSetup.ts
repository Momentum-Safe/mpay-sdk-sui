import { ensureTestWalletsReady } from './lib/faucet';

export default async function globalSetup() {
  await ensureTestWalletsReady();
}
