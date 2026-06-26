import type { Command, Transaction, TransactionArgument } from '@mysten/sui/transactions';

export type MoveCallCommand = Extract<Command, { $kind: 'MoveCall' }>;
export type MergeCoinsCommand = Extract<Command, { $kind: 'MergeCoins' }>;
export type SplitCoinsCommand = Extract<Command, { $kind: 'SplitCoins' }>;
export type TransactionInput = ReturnType<Transaction['getData']>['inputs'][number];

export function getTransactionCommands(tx: Transaction): ReturnType<Transaction['getData']>['commands'] {
  return tx.getData().commands;
}

export function getTransactionInputs(tx: Transaction): ReturnType<Transaction['getData']>['inputs'] {
  return tx.getData().inputs;
}

export function getMoveCallTarget(cmd: MoveCallCommand): string {
  const { package: pkg, module, function: fn } = cmd.MoveCall;
  return `${pkg}::${module}::${fn}`;
}

export function isMoveCallCommand(cmd: Command): cmd is MoveCallCommand {
  return cmd.$kind === 'MoveCall';
}

export function isMergeCoinsCommand(cmd: Command): cmd is MergeCoinsCommand {
  return cmd.$kind === 'MergeCoins';
}

export function isSplitCoinsCommand(cmd: Command): cmd is SplitCoinsCommand {
  return cmd.$kind === 'SplitCoins';
}

export function getTransactionArgumentKind(arg: TransactionArgument): string {
  if (typeof arg === 'function') {
    throw new Error('Unresolved transaction argument');
  }
  if ('$kind' in arg && arg.$kind) {
    return arg.$kind;
  }
  if ('GasCoin' in arg) {
    return 'GasCoin';
  }
  if ('Input' in arg) {
    return 'Input';
  }
  if ('Result' in arg) {
    return 'Result';
  }
  if ('NestedResult' in arg) {
    return 'NestedResult';
  }
  throw new Error('Unknown transaction argument kind');
}

export function getInputArgumentIndex(arg: TransactionArgument): number {
  if ('Input' in arg) {
    return arg.Input;
  }
  throw new Error('not input type');
}

export function getNestedResultIndices(arg: TransactionArgument): [number, number] {
  if ('NestedResult' in arg) {
    return arg.NestedResult;
  }
  throw new Error('not nested result type');
}
