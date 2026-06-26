import type { TransactionResultWithEffects } from '@/sui/adapters';
import { isSuccessfulTransaction } from '@/sui/adapters';

export function expectTransactionSuccess(result: TransactionResultWithEffects) {
  expect(isSuccessfulTransaction(result)).toBe(true);
}
