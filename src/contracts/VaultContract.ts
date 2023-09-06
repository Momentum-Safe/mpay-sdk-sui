import { TransactionBlock } from '@mysten/sui.js/transactions';

import { ContractConfig } from '@/common/env';
import { Globals } from '@/common/globals';
import { BaseContract } from '@/contracts/BaseContract';

export class VaultContract extends BaseContract {
  static ModuleName = 'vault';

  static MethodName = {
    withdraw_fee: 'withdraw_fee',
    balance: 'balance',
  } as const;

  constructor(
    public readonly config: ContractConfig,
    public readonly globals: Globals,
  ) {
    super(VaultContract.ModuleName, config, globals);
  }

  withdrawFee(txb: TransactionBlock, coinType: string) {
    const roleObject = this.roleObject();
    const vaultObject = this.vaultObject();
    return this.addContractCall(txb, {
      method: VaultContract.MethodName.withdraw_fee,
      arguments: [roleObject, vaultObject],
      typeArgs: [coinType],
    });
  }

  balance(txb: TransactionBlock, coinType: string) {
    const vaultObject = this.vaultObject();
    return this.addContractCall(txb, {
      method: VaultContract.MethodName.balance,
      arguments: [vaultObject],
      typeArgs: [coinType],
    });
  }
}
