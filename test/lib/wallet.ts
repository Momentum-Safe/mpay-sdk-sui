import { Keypair } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';

import type { MPaySuiClient, TransactionResultWithEffects } from '@/sui/client';
import type { SimulateTransactionResult } from '@/sui/client';
import { CoinRequest, CoinRequestResponse, IMSafeAccount, ISingleWallet } from '@/types/wallet';

export class LocalWallet implements ISingleWallet {
  private readonly kp: Keypair;

  private readonly client: MPaySuiClient;

  constructor(client: MPaySuiClient, privateKey?: string) {
    this.client = client;
    this.kp = privateKey ? Ed25519Keypair.fromSecretKey(privateKey) : new Ed25519Keypair();
  }

  async address() {
    return this.kp.toSuiAddress();
  }

  exportSecretKey(): string {
    return this.kp.getSecretKey();
  }

  async signAndSubmitTransaction(txb: Transaction): Promise<TransactionResultWithEffects> {
    return this.client.signAndExecuteTransaction({
      transaction: txb,
      signer: this.kp,
      include: {
        effects: true,
        objectTypes: true,
        events: true,
      },
    });
  }

  async inspect(txb: Transaction): Promise<SimulateTransactionResult> {
    txb.setSender(await this.address());
    return this.client.simulateTransaction({
      transaction: txb,
      checksEnabled: false,
      include: { commandResults: true },
    });
  }
}

export class FakeMSafeWallet extends LocalWallet implements IMSafeAccount {
  coinIndex: number;

  constructor(client: MPaySuiClient, privateKey?: string) {
    super(client, privateKey);
    this.coinIndex = 0;
  }

  async requestCoins(reqs: CoinRequest[]): Promise<CoinRequestResponse[]> {
    return Promise.all(reqs.map((req) => this.requestCoin(req)));
  }

  async requestCoin(req: CoinRequest): Promise<CoinRequestResponse> {
    const res = {
      primaryCoin: normalizeSuiAddress(`0x${this.coinIndex}`),
      mergedCoins: [normalizeSuiAddress(`0x${this.coinIndex + 1}`), normalizeSuiAddress(`0x${this.coinIndex + 2}`)],
    };
    this.coinIndex += 3;
    return res;
  }
}

// Fake wallet with no private key. Used for debugging and testing
export class FakeWallet implements ISingleWallet {
  constructor(public readonly walletAddress: string) {}

  async address() {
    return this.walletAddress;
  }
}

export function makeKeyPairFromPrivateKey(privateKey: string) {
  return Ed25519Keypair.fromSecretKey(privateKey);
}
