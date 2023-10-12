// Helper class to decode move call
import { bcs } from '@mysten/sui.js/bcs';
import { MoveCallTransaction, TransactionBlockInput } from '@mysten/sui.js/src/builder/Transactions';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui.js/utils';

// export class MoveCallHelper {
//   constructor(
//     public readonly moveCall: MoveCallTransaction,
//     public readonly txb: TransactionBlock,
//   ) {}
//
//   inputStringArgument(index: number): string {
//     const rawVal = this.inputPureArgument(index);
//     return rawVal.value as string;
//   }
//
//   inputAddressArgument(index: number): string {
//     const addr = this.inputStringArgument(index);
//     return normalizeSuiAddress(addr);
//   }
//
//   inputU64Argument(index: number): bigint {
//     const rawVal = this.inputPureArgument(index);
//     return BigInt(rawVal.value as string);
//   }
//
//   inputBoolArgument(index: number): boolean {
//     const rawVal = this.inputPureArgument(index);
//     return rawVal.value as boolean;
//   }
//
//   inputPureArgument(i: number) {
//     const targetArg = this.moveCall.arguments[i];
//     if (targetArg.kind !== 'Input') {
//       throw new InvalidInputError('Argument type not pure input');
//     }
//
//     if (targetArg.type === 'pure') {
//       return targetArg;
//     }
//     if (targetArg.index !== undefined) {
//       const inputArg = this.txb.blockData.inputs[targetArg.index];
//
//       console.log(this.txb.blockData.inputs[targetArg.index]);
//     }
//     return targetArg.value;
//   }
//
//   inputOwnedObjectArgument(i: number): string {
//     const targetArg = this.moveCall.arguments[i];
//     return this.getOwnedObjectAddress(targetArg);
//   }
//
//   getOwnedObjectAddress(targetArg: TransactionArgument) {
//     if (targetArg.kind !== 'Input' || targetArg.type !== 'object') {
//       throw new Error('Argument type should be object');
//     }
//     const inputArg = this.txb.blockData.inputs[targetArg.index];
//     if (inputArg.value.Object) {
//       if (!inputArg.value.Object.ImmOrOwned) {
//         throw new Error('Object transaction argument shall be ImmOrOwned');
//       }
//       return inputArg.value.Object.ImmOrOwned.ObjectId;
//     }
//     return inputArg.value as string;
//   }
//
//   inputSharedObjectArgument(i: number): string {
//     const targetArg = this.moveCall.arguments[i];
//     return this.getSharedObjectAddress(targetArg);
//   }
//
//   getSharedObjectAddress(targetArg: TransactionArgument) {
//     if (targetArg.kind !== 'Input' || targetArg.type !== 'object') {
//       throw new Error('Argument type should be object');
//     }
//     const inputArg = this.txb.blockData.inputs[targetArg.index];
//     if (inputArg.value.Object) {
//       if (!inputArg.value.Object.Shared) {
//         throw new Error(' Object transaction argument shall be shared');
//       }
//       return inputArg.value.Object.Shared.ObjectId;
//     }
//     return inputArg.value as string;
//   }
//
//   txArgument(i: number) {
//     return this.moveCall.arguments[i];
//   }
//
//   nestedArgument(i: number) {
//     const targetArg = this.moveCall.arguments[i];
//     if (targetArg.kind !== 'NestedResult') {
//       throw new InvalidInputError('Not nested result');
//     }
//     if (targetArg.resultIndex !== 0) {
//       throw new InvalidInputError('Nested result index not expected. Expect: 0');
//     }
//     return targetArg;
//   }
//
//   typeArg(index: number) {
//     return normalizeStructTag(this.moveCall.typeArguments[index]);
//   }
// }

export class MoveCallHelper {
  constructor(
    public readonly moveCall: MoveCallTransaction,
    public readonly txb: TransactionBlock,
  ) {}

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

  getInputParam(argIndex: number) {
    const arg = this.moveCall.arguments[argIndex];
    if (arg.kind !== 'Input') {
      throw new Error('not input type');
    }
    return this.txb.blockData.inputs[arg.index];
  }

  static getPureInputValue<T>(input: TransactionBlockInput, bcsType: string) {
    if (input.type !== 'pure') {
      throw new Error('not pure argument');
    }
    if (typeof input.value === 'object' && 'Pure' in input.value) {
      const bcsNums = input.value.Pure;
      return bcs.de(bcsType, new Uint8Array(bcsNums)) as T;
    }
    return input.value as T;
  }

  static getOwnedObjectId(input: TransactionBlockInput) {
    if (input.type !== 'object') {
      throw new Error(`not object argument: ${JSON.stringify(input)}`);
    }
    if (typeof input.value === 'object') {
      if (!('Object' in input.value) || !('ImmOrOwned' in input.value.Object)) {
        throw new Error('not ImmOrOwned');
      }
      return input.value.Object.ImmOrOwned.objectId as string;
    }
    return normalizeSuiAddress(input.value as string);
  }

  static getSharedObjectId(input: TransactionBlockInput) {
    if (input.type !== 'object') {
      throw new Error(`not object argument: ${JSON.stringify(input)}`);
    }
    if (typeof input.value !== 'object') {
      return input.value as string;
    }
    if (!('Object' in input.value) || !('Shared' in input.value.Object)) {
      throw new Error('not Shared');
    }
    return normalizeSuiAddress(input.value.Object.Shared.objectId as string);
  }

  static getPureInput<T>(input: TransactionBlockInput, bcsType: string) {
    if (input.type !== 'pure') {
      throw new Error('not pure argument');
    }
    if (typeof input.value !== 'object') {
      return input.value as T;
    }
    if (!('Pure' in input.value)) {
      throw new Error('Pure not in value');
    }
    const bcsVal = input.value.Pure;
    return bcs.de(bcsType, new Uint8Array(bcsVal)) as T;
  }

  typeArg(index: number) {
    return normalizeStructTag(this.moveCall.typeArguments[index]);
  }

  txArg(index: number) {
    return this.moveCall.arguments[index];
  }
}
