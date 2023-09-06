import { SanityError } from '@/error/SanityError';

import * as localContractConfig from '../../config/local.json';

export enum Env {
  local = 'local',
  unit = 'unit',
  dev = 'dev',
  staged = 'staged',
  prod = 'prod',
}

export interface EnvConfig {
  env: Env;
  rpc: SuiConfig;
  backend?: BackendConfig; // TODO: Make this field required
  contract: ContractConfig;
}

export interface BackendConfig {
  url: string;
}

export interface SuiConfig {
  url: string;
  faucet?: string;
}

export interface ContractConfig {
  contractId: string;
  roleObjId: string;
  vaultObjId: string;
  feeObjId: string;
}

export const UNIT_RPC_ENDPOINT = 'https://49zv7vxt2h.execute-api.us-west-1.amazonaws.com/sui-endpoint';
export const DEV_RPC_ENDPOINT = 'https://sui-testnet.blockvision.org/v1/2Sgk89ivT64MnKdcGzjmyjY2ndD';
export const STG_RPC_ENDPOINT = 'https://sui-testnet.blockvision.org/v1/2Sgk89ivT64MnKdcGzjmyjY2ndD';
export const PROD_RPC_ENDPOINT = 'https://sui-mainnet.blockvision.org/v1/2Sgk7NPvqkd7mESYkxF01yX15l7';

export const DEV_EXPLORE_URL = `https://suiexplorer.com/?network=${DEV_RPC_ENDPOINT}/fullnode`;
export const UNIT_BE_API = 'https://e2v6vzfen1.execute-api.us-west-1.amazonaws.com/prod';
export const DEV_BE_API = 'https://bc3p6l5unl.execute-api.us-west-1.amazonaws.com/prod';
export const STG_BE_API = 'https://rolsbkota7.execute-api.us-west-1.amazonaws.com/prod';
export const PROD_BE_API = 'https://xrae3mrjv5.execute-api.us-west-1.amazonaws.com/prod';

export const CONTRACT_LOCAL: ContractConfig = localContractConfig;

const ENV_CONFIG: Map<Env, EnvConfig> = new Map([
  [
    Env.unit,
    {
      env: Env.unit,
      rpc: {
        url: `${UNIT_RPC_ENDPOINT}/fullnode`,
        faucet: 'http://ec2-13-52-78-128.us-west-1.compute.amazonaws.com:9123',
      },
      contract: CONTRACT_LOCAL,
    },
  ],
]);

export function getConfig(env: Env): EnvConfig {
  const ec = ENV_CONFIG.get(env);
  if (!ec) {
    throw new SanityError(`Env not supported: ${env}`);
  }
  return ec;
}
