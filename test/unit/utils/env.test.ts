import { Env } from '@/common';
import { MPayClient } from '@/stream';

import * as DEV_CONFIG from '../../../config/dev.json';
import * as PROD_CONFIG from '../../../config/prod.json';

describe('MPayClient with different env', () => {
  it('production', () => {
    const client = new MPayClient(Env.prod);
    const { globals } = client;
    expect(globals.envConfig.contract).toEqual(PROD_CONFIG);
    expect(globals.envConfig.rpc.url.includes('mainnet')).toBeTruthy();
  });

  it('preview', () => {
    const client = new MPayClient(Env.prev);
    const { globals } = client;
    expect(globals.envConfig.contract).toEqual(PROD_CONFIG);
    expect(globals.envConfig.rpc.url.includes('mainnet')).toBeTruthy();
  });

  it('dev', () => {
    const client = new MPayClient(Env.dev);
    const { globals } = client;
    expect(globals.envConfig.contract).toEqual(DEV_CONFIG);
    expect(globals.envConfig.rpc.url.includes('testnet')).toBeTruthy();
  });
});
