import { SuiClient } from '@mysten/sui.js/client';
import { Keypair } from '@mysten/sui.js/cryptography';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';

import { ISingleWallet } from '@/types/wallet';

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

export function makeKeyPairFromPrivateKey(privateKey: string) {
  return Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
}
