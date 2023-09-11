import { Env, EnvConfigOptions } from '@/common/env';
import { Globals } from '@/common/globals';
import { IMSafeAccount, ISingleWallet } from '@/types/wallet';

// export class MPayClient implements IMPayClient {
export class MPayClient {
  public readonly globals: Globals;

  constructor(env: Env, options?: EnvConfigOptions) {
    this.globals = Globals.new(env, options);
  }

  connectSingleWallet(wallet: ISingleWallet) {
    this.globals.connectWallet(wallet);
  }

  connectMSafeAccount(msafe: IMSafeAccount) {
    this.globals.connectMSafe(msafe);
  }

  // getStream(streamID: string) {
  //
  // }
}
