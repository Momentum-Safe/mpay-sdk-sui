import axios from 'axios';

import { Backend } from '@/stream/backend';

const API = 'https://sui.m-safe.link';

describe('backend http', () => {
  const urls: string[] = [];
  const originalFetch = global.fetch;

  beforeEach(() => {
    urls.length = 0;
    global.fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes('/stream/event/')) {
        return new Response(JSON.stringify({ data: [], meta: { page: 1, limit: 20, total: 0 } }), { status: 200 });
      }
      if (url.includes('/stream/ids')) {
        return new Response(JSON.stringify({ groupId: 'nano id', streamIds: [] }), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('keeps the indexer query string used by axios', async () => {
    const backend = new Backend(API);
    const recipient = '0xb924811f0b632a013389ce4038ba8fe565f3cef006df9d960ff3b163e2c08543';
    const coinTypes = ['0x2::sui::SUI', '0xabc::mod::COIN'];

    await backend.getIncomingStreams(recipient, { status: 'active', coinType: coinTypes });
    await backend.getOutgoingStreams(recipient, { coinType: '0x2::sui::SUI', recipient: ['0x1', '0x2'] });
    await backend.getStreamHistory({ streamId: '0xabc', pagination: { pageNumber: 1, pageSize: 20 } });
    await backend.getStreamGroupByGroupId('nano id');

    expect(urls).toEqual([
      axios.getUri({
        url: `${API}/stream/incoming`,
        params: { recipient, status: 'active', coinTypes, senders: undefined },
      }),
      axios.getUri({
        url: `${API}/stream/outgoing`,
        params: { sender: recipient, status: undefined, coinTypes: '0x2::sui::SUI', recipients: ['0x1', '0x2'] },
      }),
      axios.getUri({
        url: `${API}/stream/event/stream`,
        params: { streamAddress: '0xabc', page: 1, limit: 20 },
      }),
      axios.getUri({
        url: `${API}/stream/ids`,
        params: { groupId: 'nano id' },
      }),
    ]);
  });

  it('surfaces an indexer error message without the response body', async () => {
    global.fetch = async () =>
      new Response(JSON.stringify({ message: 'missing stream', secret: 'do-not-leak' }), { status: 404 });
    const backend = new Backend(API);
    await expect(backend.getIncomingStreams('0x1')).rejects.toThrow(
      'Request to https://sui.m-safe.link/stream/incoming?recipient=0x1 failed: 404 missing stream',
    );
  });

  it('reports the status code when the error body has no message', async () => {
    global.fetch = async () => new Response('nope', { status: 500 });
    const backend = new Backend(API);
    await expect(backend.getAllCoinTypes('0x1')).rejects.toThrow('Request failed with status code 500');
  });
});
