import { SuiObjectChangeCreated, SuiTransactionBlockResponse } from '@mysten/sui.js/client';

import { Globals } from '@/common/globals';
import { TransactionFailedError } from '@/error/TransactionFailedError';

export class MPayHelper {
  constructor(public readonly globals: Globals) {}

  getStreamIdsFromCreateStreamResponse(res: SuiTransactionBlockResponse) {
    if (res.effects?.status.status !== 'success') {
      throw new TransactionFailedError(res.effects?.status.status, res.effects?.status.error);
    }
    return res
      .objectChanges!.filter(
        (change) =>
          change.type === 'created' &&
          change.objectType.startsWith(`${this.globals.envConfig.contract.contractId}::stream::Stream`),
      )
      .map((change) => (change as SuiObjectChangeCreated).objectId);
  }
}
