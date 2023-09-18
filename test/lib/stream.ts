import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { encodeMetadata } from '@/stream/metadata';
import { CreateStreamInfoInternal } from '@/types/client';
import { generateGroupId } from '@/utils/random';

export function defaultStreamParam(recipient: string): CreateStreamInfoInternal {
  const metadata = encodeMetadata({
    name: 'test name',
    groupId: generateGroupId(),
  });
  return {
    metadata,
    coinType: SUI_TYPE_ARG,
    recipients: [
      {
        address: recipient,
        cliffAmount: 10000n,
        amountPerEpoch: 5000n,
      },
      {
        address: recipient,
        cliffAmount: 5000n,
        amountPerEpoch: 1000n,
      },
    ],
    epochInterval: 1000n,
    numberEpoch: 100n,
    startTime: BigInt(new Date().getTime()),
    cancelable: true,
  };
}
