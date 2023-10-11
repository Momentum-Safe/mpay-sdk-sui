import { SuiClient } from '@mysten/sui.js/client';
import { Keypair } from '@mysten/sui.js/cryptography';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { normalizeSuiAddress } from '@mysten/sui.js/utils';

import { CoinRequest, CoinRequestResponse, IMSafeAccount, ISingleWallet } from '@/types/wallet';

export class LocalWallet implements ISingleWallet {
  private readonly kp: Keypair;

  private readonly client: SuiClient;

  constructor(client: SuiClient, privateKey?: string) {
    this.client = client;
    this.kp = privateKey ? makeKeyPairFromPrivateKey(privateKey) : new Ed25519Keypair();
  }

  async address() {
    return this.kp.toSuiAddress();
  }

  async signAndSubmitTransaction(txb: TransactionBlock) {
    return this.client.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      signer: this.kp,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
  }

  async inspect(txb: TransactionBlock) {
    return this.client.devInspectTransactionBlock({
      sender: await this.address(),
      transactionBlock: txb,
    });
  }
}

export class FakeMSafeWallet extends LocalWallet implements IMSafeAccount {
  coinIndex: number;

  constructor(client: SuiClient, privateKey?: string) {
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
  return Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
}
