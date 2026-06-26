import { MockBackend } from '../../lib/backend';

const TEST_WALLET = '0xb924811f0b632a013389ce4038ba8fe565f3cef006df9d960ff3b163e2c08543';

function createTestBackend() {
  const backend = new MockBackend();
  backend.addStreamRef({
    groupId: 'test-group-1',
    streamId: '0x1',
    sender: TEST_WALLET,
    recipient: TEST_WALLET,
    coinType: '0x2::sui::SUI',
    createDate: '2023-09-18T06:26:59.000Z',
  });
  return backend;
}

describe('backend', () => {
  it('get all coin types', async () => {
    const backend = createTestBackend();
    const coinTypes = await backend.getAllCoinTypes(TEST_WALLET);
    expect(coinTypes.length).toBe(1);
  });

  it('get all recipients', async () => {
    const backend = createTestBackend();
    const recipients = await backend.getAllRecipients(TEST_WALLET);
    expect(recipients.length).toBe(1);
  });

  it('get all senders', async () => {
    const backend = createTestBackend();
    const senders = await backend.getAllSenders(TEST_WALLET);
    expect(senders.length).toBe(1);
  });
});
