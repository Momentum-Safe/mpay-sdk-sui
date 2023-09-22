import { DateTime } from 'luxon';

import { groupAndSortRefs } from '@/stream/query';
import { StreamRef } from '@/types/backend';

const TEST_REFS: StreamRef[] = [
  {
    groupID: '1695018413554',
    streamID: '0x7b0891696e42568f9bdb3fccb2a973f4c07c6553c3878e1be1af52320f8ce535',
    sender: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    recipient: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    coinType: '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    createDate: '2023-09-18T06:26:59.000Z',
  },
  {
    groupID: '1695018413554',
    streamID: '0x08a749a7049669cf89b4bb7d7ecdf9a6210d253a65ccf127f507316074b612a5',
    sender: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    recipient: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    coinType: '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    createDate: '2023-09-18T06:26:59.000Z',
  },
  {
    groupID: '1695018413553',
    streamID: '0x08a749a7049669cf89b4bb7d7ecdf9a6210d253a65ccf127f507316074b612a5',
    sender: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    recipient: '0xb7fc1102e0250e7c0d3deab435d106a38aa41cc9985d226a1e57a9fbdf95daf7',
    coinType: '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    createDate: '2023-09-17T06:26:59.000Z',
  },
];

describe('groupAndSortRefs', () => {
  it('test group', () => {
    const res = groupAndSortRefs(TEST_REFS);
    expect(res.length).toBe(2);

    res.forEach((groupList) => {
      expect(new Set(groupList.map((st) => st.groupID)).size).toBe(1);
    });

    const date1 = DateTime.fromISO(res[0][0].createDate);
    const date2 = DateTime.fromISO(res[1][0].createDate);
    expect(date1.toMillis()).toBeGreaterThan(date2.toMillis());
  });
});
