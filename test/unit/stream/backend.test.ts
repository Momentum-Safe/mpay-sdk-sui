import { newUnitGlobals } from '../../lib/setup';

// Currently depending on backend data. Redo the tests later.
describe('backend', () => {
  const backend = newUnitGlobals()._backend!;
  const testWallet = '0xb924811f0b632a013389ce4038ba8fe565f3cef006df9d960ff3b163e2c08543';

  it('get all coin types', async () => {
    const coinTypes = await backend.getAllCoinTypes(testWallet);
    expect(coinTypes.length).toBe(1);
  });

  it('get all recipients', async () => {
    const recipients = await backend.getAllRecipients(testWallet);
    expect(recipients.length).toBe(1);
  });

  it('get all senders', async () => {
    const senders = await backend.getAllSenders(testWallet);
    expect(senders.length).toBe(1);
  });
});
