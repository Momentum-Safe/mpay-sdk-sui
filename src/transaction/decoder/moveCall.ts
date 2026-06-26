import { pureBcsSchemaFromTypeName, type PureTypeName } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui/utils';

import type { MoveCallCommand, TransactionInput } from '@/sui/transaction-data';
import { getTransactionInputs } from '@/sui/transaction-data';

export class MoveCallHelper {
  constructor(
    public readonly moveCall: MoveCallCommand,
    public readonly txb: Transaction,
  ) {}

  private get moveCallData() {
    return this.moveCall.MoveCall;
  }

  decodeSharedObjectId(argIndex: number) {
    const input = this.getInputParam(argIndex);
    return MoveCallHelper.getSharedObjectId(input);
  }

  decodeOwnedObjectId(argIndex: number) {
    const input = this.getInputParam(argIndex);
    return MoveCallHelper.getOwnedObjectId(input);
  }

  decodeInputU64(argIndex: number) {
    const strVal = this.decodePureArg<string>(argIndex, 'u64');
    return BigInt(strVal);
  }

  decodeInputAddress(argIndex: number) {
    const input = this.decodePureArg<string>(argIndex, 'address');
    return normalizeSuiAddress(input);
  }

  decodeInputString(argIndex: number) {
    return this.decodePureArg<string>(argIndex, 'string');
  }

  decodeInputBool(argIndex: number) {
    return this.decodePureArg<boolean>(argIndex, 'bool');
  }

  decodePureArg<T>(argIndex: number, bcsType: string) {
    const input = this.getInputParam(argIndex);
    return MoveCallHelper.getPureInputValue<T>(input, bcsType);
  }

  getInputParam(argIndex: number): TransactionInput {
    const arg = this.moveCallData.arguments[argIndex];
    if (arg.$kind !== 'Input') {
      throw new Error('not input type');
    }
    return getTransactionInputs(this.txb)[arg.Input];
  }

  static getPureInputValue<T>(input: TransactionInput, bcsType: string) {
    return MoveCallHelper.getPureInput<T>(input, bcsType);
  }

  static getOwnedObjectId(input: TransactionInput) {
    if (input.$kind === 'UnresolvedObject') {
      return normalizeSuiAddress(input.UnresolvedObject.objectId);
    }
    if (input.$kind !== 'Object') {
      throw new Error(`not object argument: ${JSON.stringify(input)}`);
    }
    const objectArg = input.Object;
    if (objectArg.$kind === 'ImmOrOwnedObject') {
      return normalizeSuiAddress(objectArg.ImmOrOwnedObject.objectId);
    }
    if (objectArg.$kind === 'Receiving') {
      return normalizeSuiAddress(objectArg.Receiving.objectId);
    }
    throw new Error('not ImmOrOwned');
  }

  static getSharedObjectId(input: TransactionInput) {
    if (input.$kind === 'UnresolvedObject') {
      return normalizeSuiAddress(input.UnresolvedObject.objectId);
    }
    if (input.$kind !== 'Object') {
      throw new Error(`not object argument: ${JSON.stringify(input)}`);
    }
    const objectArg = input.Object;
    if (objectArg.$kind !== 'SharedObject') {
      throw new Error('not Shared');
    }
    return normalizeSuiAddress(objectArg.SharedObject.objectId);
  }

  static getPureInput<T>(input: TransactionInput, bcsType: string) {
    if (input.$kind === 'Pure') {
      const schema = pureBcsSchemaFromTypeName(bcsType as PureTypeName);
      return schema.fromBase64(input.Pure.bytes) as T;
    }
    if (input.$kind === 'UnresolvedPure') {
      return input.UnresolvedPure.value as T;
    }
    throw new Error('not pure argument');
  }

  typeArg(index: number) {
    return normalizeStructTag(this.moveCallData.typeArguments[index]);
  }

  txArg(index: number) {
    return this.moveCallData.arguments[index];
  }
}
