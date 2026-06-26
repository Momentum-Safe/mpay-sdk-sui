import type { SimulateTransactionResult } from '@/sui/client';
import { decodeSimulatedAddress, decodeSimulatedU64 } from '@/sui/adapters';

export class InspectViewer {
  constructor(readonly results: SimulateTransactionResult) {}

  getAddress(callIndex = 0, returnIndex = 0) {
    return decodeSimulatedAddress(this.results, callIndex, returnIndex);
  }

  getU64(callIndex = 0, returnIndex = 0) {
    return decodeSimulatedU64(this.results, callIndex, returnIndex);
  }
}
