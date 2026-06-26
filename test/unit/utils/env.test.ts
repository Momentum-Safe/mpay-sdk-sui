import { CONTRACT_DEV, CONTRACT_PROD, Env } from '@/common';
import { MPayClient } from '@/stream';

describe('MPayClient with different env', () => {
  it('production', () => {
    const client = new MPayClient(Env.prod);
    const { globals } = client;
    expect(globals.envConfig.contract).toEqual(CONTRACT_PROD);
    expect(globals.envConfig.rpc.url.includes('mainnet')).toBeTruthy();
  });

  it('preview', () => {
    const client = new MPayClient(Env.prev);
    const { globals } = client;
    expect(globals.envConfig.contract).toEqual(CONTRACT_PROD);
    expect(globals.envConfig.rpc.url.includes('mainnet')).toBeTruthy();
  });

  it('dev', () => {
    const client = new MPayClient(Env.dev);
    const { globals } = client;
    expect(globals.envConfig.contract).toEqual(CONTRACT_DEV);
    expect(globals.envConfig.rpc.url.includes('testnet')).toBeTruthy();
  });
});
