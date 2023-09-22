import { SuiObjectChangeCreated, SuiTransactionBlockResponse } from '@mysten/sui.js/client';

import { Globals } from '@/common/globals';

export class MPayHelper {
  constructor(public readonly globals: Globals) {}

  getStreamIdsFromCreateStreamResponse(res: SuiTransactionBlockResponse) {
    return res
      .objectChanges!.filter(
        (change) =>
          change.type === 'created' &&
          change.objectType.startsWith(`${this.globals.envConfig.contract.contractId}::stream::Stream`),
      )
      .map((change) => (change as SuiObjectChangeCreated).objectId);
  }
}
