// Helper class to decode move call
import { MoveCallTransaction } from '@mysten/sui.js/src/builder/Transactions';
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui.js/utils';

import { InvalidInputError } from '@/error/InvalidInputError';

export class MoveCallHelper {
  constructor(public readonly moveCall: MoveCallTransaction) {}

  inputStringArgument(index: number): string {
    const rawVal = this.inputPureArgument(index);
    return rawVal.value as string;
  }

  inputAddressArgument(index: number): string {
    const addr = this.inputStringArgument(index);
    return normalizeSuiAddress(addr);
  }

  inputU64Argument(index: number): bigint {
    const rawVal = this.inputPureArgument(index);
    return BigInt(rawVal.value as string);
  }

  inputBoolArgument(index: number): boolean {
    const rawVal = this.inputPureArgument(index);
    return rawVal.value as boolean;
  }

  inputPureArgument(i: number) {
    const targetArg = this.moveCall.arguments[i];
    if (targetArg.kind !== 'Input' || targetArg.type !== 'pure') {
      throw new InvalidInputError('Argument type not pure input');
    }
    return targetArg;
  }

  inputObjectArgument(i: number) {
    const targetArg = this.moveCall.arguments[i];
    if (targetArg.kind !== 'Input' || targetArg.type !== 'object') {
      throw new Error('Argument type not object');
    }
    return targetArg.value as string;
  }

  txArgument(i: number) {
    return this.moveCall.arguments[i];
  }

  nestedArgument(i: number) {
    const targetArg = this.moveCall.arguments[i];
    if (targetArg.kind !== 'NestedResult') {
      throw new InvalidInputError('Not nested result');
    }
    if (targetArg.resultIndex !== 0) {
      throw new InvalidInputError('Nested result index not expected. Expect: 0');
    }
    return targetArg;
  }

  typeArg(index: number) {
    return normalizeStructTag(this.moveCall.typeArguments[index]);
  }
}
