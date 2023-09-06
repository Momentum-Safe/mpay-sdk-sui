import { TransactionBlock } from '@mysten/sui.js/transactions';

import { ContractConfig } from '@/common/env';
import { Globals } from '@/common/globals';
import { BaseContract } from '@/contracts/BaseContract';

export class RoleContract extends BaseContract {
  static ModuleName = 'role';

  static MethodName = {
    set_collector: 'set_collector',
    transfer_admin: 'transfer_admin',
    accept_admin: 'accept_admin',
    get_collector: 'get_collector',
    get_pending_admin: 'get_pending_admin',
    get_admin: 'get_admin',
  } as const;

  constructor(
    public readonly config: ContractConfig,
    public readonly globals: Globals,
  ) {
    super(RoleContract.ModuleName, config, globals);
  }

  setCollector(txb: TransactionBlock, newCollector: string) {
    const roleObject = this.roleObject();
    return this.addContractCall(txb, {
      method: RoleContract.MethodName.set_collector,
      arguments: [roleObject, newCollector],
      typeArgs: [],
    });
  }

  transferAdmin(txb: TransactionBlock, newAdmin: string) {
    const roleObject = this.roleObject();
    return this.addContractCall(txb, {
      method: RoleContract.MethodName.transfer_admin,
      arguments: [roleObject, newAdmin],
      typeArgs: [],
    });
  }

  acceptAdmin(txb: TransactionBlock) {
    const roleObject = this.roleObject();
    return this.addContractCall(txb, {
      method: RoleContract.MethodName.accept_admin,
      arguments: [roleObject],
      typeArgs: [],
    });
  }

  getCollector(txb: TransactionBlock) {
    const roleObject = this.roleObject();
    return this.addContractCall(txb, {
      method: RoleContract.MethodName.get_collector,
      arguments: [roleObject],
      typeArgs: [],
    });
  }

  getPendingAdmin(txb: TransactionBlock) {
    const roleObject = this.roleObject();
    return this.addContractCall(txb, {
      method: RoleContract.MethodName.get_pending_admin,
      arguments: [roleObject],
      typeArgs: [],
    });
  }

  getAdmin(txb: TransactionBlock) {
    const roleObject = this.roleObject();
    return this.addContractCall(txb, {
      method: RoleContract.MethodName.get_admin,
      arguments: [roleObject],
      typeArgs: [],
    });
  }
}
