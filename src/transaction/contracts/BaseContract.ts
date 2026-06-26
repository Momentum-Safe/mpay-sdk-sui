import { Transaction, TransactionCommands } from '@mysten/sui/transactions';

import { ContractConfig } from '@/common/env';
import { Globals } from '@/common/globals';
import { MoveObject, ObjectId, ObjectVector, Ref, ResultRef } from '@/transaction/contracts/common';
import { CLOCK_ID } from '@/transaction/contracts/const';

function toPureArgument(txb: Transaction, arg: unknown) {
  if (typeof arg === 'boolean') {
    return txb.pure.bool(arg);
  }
  if (typeof arg === 'bigint') {
    return txb.pure.u64(arg);
  }
  if (typeof arg === 'number') {
    return txb.pure.u64(arg);
  }
  if (typeof arg === 'string') {
    if (arg.startsWith('0x')) {
      return txb.pure.address(arg);
    }
    return txb.pure.string(arg);
  }
  throw new Error(`Unsupported pure argument type: ${typeof arg}`);
}

export class BaseContract {
  constructor(
    public readonly moduleName: string,
    public readonly config: ContractConfig,
    public readonly globals: Globals,
  ) {}

  addContractCall(txb: Transaction, input: { method: string; arguments: any[]; typeArgs?: string[] }) {
    const target =
      `${this.config.contractId}::${this.moduleName}::${input.method}` as `${string}::${string}::${string}`;
    txb.add(
      TransactionCommands.MoveCall({
        target,
        arguments: input.arguments.map((arg) => {
          if (arg instanceof ObjectVector) {
            return arg.moveArgs(txb);
          }
          if (arg instanceof MoveObject) {
            return arg.moveArg(txb);
          }
          if (arg instanceof ResultRef) {
            return arg.moveArg() as ReturnType<typeof txb.object>;
          }
          return toPureArgument(txb, arg);
        }),
        typeArguments: input.typeArgs,
      }),
    );
    return txb;
  }

  private addTransaction(txb: Transaction, target: string, callArgs: any[] = [], typeArgs: string[] = []) {
    txb.add(
      TransactionCommands.MoveCall({
        target: target as `${string}::${string}::${string}`,
        arguments: callArgs.map((arg) => {
          if (arg instanceof ObjectVector) {
            return arg.moveArgs(txb);
          }
          if (arg instanceof MoveObject) {
            return arg.moveArg(txb);
          }
          if (arg instanceof ResultRef) {
            return arg.moveArg() as ReturnType<typeof txb.object>;
          }
          return toPureArgument(txb, arg);
        }),
        typeArguments: typeArgs,
      }),
    );
  }

  makeObject(object: Ref<ObjectId>) {
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
