import { CreateStreamInfo } from '@/types/client';

export const now = () => Date.now();

export function defaultStreamParam(recipient: string): CreateStreamInfo {
  return {
    name: 'Stream Test',
    coinType: '0x2::sui::SUI',
    recipients: [
      {
        address: recipient,
        amount: 5000000n,
      },
    ],
    interval: 10000n,
    steps: 2n,
    startTime: new Date(now() + 5000),
    cliffAmount: 3000000n,
    cancelable: false,
  };
}
