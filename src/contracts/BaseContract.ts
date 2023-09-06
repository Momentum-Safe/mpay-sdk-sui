import { TransactionBlock, Transactions } from '@mysten/sui.js/transactions';

import { ContractConfig } from '@/common/env';
import { Globals } from '@/common/globals';
import { MoveObject, ObjectID, ObjectVector, Ref, ResultRef } from '@/contracts/common';
import { CLOCK_ID } from '@/contracts/const';

export class BaseContract {
  constructor(
    public readonly moduleName: string,
    public readonly config: ContractConfig,
    public readonly globals: Globals,
  ) {}

  addContractCall(txb: TransactionBlock, input: { method: string; arguments: any[]; typeArgs: string[] }) {
    const target =
      `${this.config.contractId}::${this.moduleName}::${input.method}` as `${string}::${string}::${string}`;
    txb.add(
      Transactions.MoveCall({
        target,
        arguments: input.arguments.map((arg) => {
          if (arg instanceof ObjectVector) {
            return arg.moveArgs(txb);
          }
          if (arg instanceof MoveObject) {
            return arg.moveArg(txb);
          }
          if (arg instanceof ResultRef) {
            return arg.moveArg();
          }
          return txb.pure(arg);
        }),
        typeArguments: input.typeArgs,
      }),
    );
    return txb;
  }

  private addTransactionBlock(txb: TransactionBlock, target: string, callArgs: any[] = [], typeArgs: string[] = []) {
    txb.add(
      Transactions.MoveCall({
        target,
        arguments: callArgs.map((arg) => {
          if (arg instanceof ObjectVector) {
            return arg.moveArgs(txb);
          }
          if (arg instanceof MoveObject) {
            return arg.moveArg(txb);
          }
          if (arg instanceof ResultRef) {
            return arg.moveArg();
          }
          return txb.pure(arg);
        }),
        typeArguments: typeArgs,
      }),
    );
  }

  makeObject(object: Ref<ObjectID>) {
    return typeof object === 'string' ? new MoveObject(object) : object;
  }

  vaultObject() {
    return new MoveObject(this.config.vaultObjId);
  }

  roleObject() {
    return new MoveObject(this.config.roleObjId);
  }

  feeObject() {
    return new MoveObject(this.config.feeObjId);
  }

  clockObject() {
    return new MoveObject(CLOCK_ID);
  }
}
