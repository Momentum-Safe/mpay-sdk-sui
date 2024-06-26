import { TransactionBlock } from '@mysten/sui.js/transactions';
import { normalizeStructTag, SUI_TYPE_ARG } from '@mysten/sui.js/utils';

import { Env } from '@/common';
import { Globals } from '@/common/globals';
import { MPayClient, Stream } from '@/stream';
import { MPayBuilder } from '@/transaction/builder/MPayBuilder';
import { StreamTransactionDecoder } from '@/transaction/decoder/decoder';
import { CreateStreamInfo } from '@/types';
import {
  DecodedCancelStream,
  DecodedClaimByProxy,
  DecodedClaimStream,
  DecodedCreateStream,
  DecodedSetAutoClaim,
  StreamTransactionType,
} from '@/types/decode';
import { SingleWalletAdapter } from '@/wallet';

import { getTestSuite, getTestSuiteWithFakeMSafe, TestSuite } from '../../lib/setup';
import { defaultStreamParam } from '../../lib/stream';

describe('decode create stream transaction', () => {
  let msafeTS: TestSuite;
  let singleTS: TestSuite;

  beforeAll(async () => {
    msafeTS = await getTestSuiteWithFakeMSafe();
    singleTS = await getTestSuite();
  });

  it('single coin, single recipient', async () => {
    const defaultInfo = defaultStreamParam(await msafeTS.globals.walletAddress());
    const expInfo: CreateStreamInfo = {
      ...defaultInfo,
      coinType: normalizeStructTag(defaultInfo.coinType),
      recipients: [defaultInfo.recipients[0]],
    };
    const txb = await getCreateStreamTxb(msafeTS.globals, expInfo);
    const decoded = StreamTransactionDecoder.decodeTransaction(msafeTS.globals, txb) as DecodedCreateStream;
    expect(decoded).toBeDefined();
    expect(decoded?.type).toBe(StreamTransactionType.CREATE_STREAM);
    expect(decoded?.info).toEqual(expInfo);
    expect(decoded?.coinMerges.length).toBe(1);
  });

  it('single coin, multiple recipient', async () => {
    const defaultInfo = defaultStreamParam(await msafeTS.globals.walletAddress());
    const expInfo: CreateStreamInfo = {
      ...defaultInfo,
      coinType: normalizeStructTag(defaultInfo.coinType),
    };
    const txb = await getCreateStreamTxb(msafeTS.globals, expInfo);
    const decoded = StreamTransactionDecoder.decodeTransaction(msafeTS.globals, txb) as DecodedCreateStream;
    expect(decoded).toBeDefined();
    expect(decoded?.type).toBe(StreamTransactionType.CREATE_STREAM);
    expect(decoded?.info).toEqual(expInfo);
    expect(decoded?.coinMerges.length).toBe(1);
  });

  it('multiple coin, multiple recipient', async () => {
    const defaultInfo = defaultStreamParam(await msafeTS.globals.walletAddress());
    const expInfo: CreateStreamInfo = {
      ...defaultInfo,
      coinType: normalizeStructTag('0x3::my_coin::MyCoin'),
    };
    const txb = await getCreateStreamTxb(msafeTS.globals, expInfo);
    const decoded = StreamTransactionDecoder.decodeTransaction(msafeTS.globals, txb) as DecodedCreateStream;
    expect(decoded?.type).toBe(StreamTransactionType.CREATE_STREAM);
    expect(decoded?.info).toEqual(expInfo);
    expect(decoded?.coinMerges.length).toBe(2);
    expect(decoded?.coinMerges[0].coinType).toBe(normalizeStructTag('0x3::my_coin::MyCoin'));
    expect(decoded?.coinMerges[1].coinType).toBe(normalizeStructTag(SUI_TYPE_ARG));
  });

  it('single coin, single signer, get txb.signer', async () => {
    const defaultInfo = defaultStreamParam(await singleTS.globals.walletAddress());
    const expInfo: CreateStreamInfo = {
      ...defaultInfo,
      coinType: normalizeStructTag(defaultInfo.coinType),
    };
    const txb = await getCreateStreamTxb(singleTS.globals, expInfo);
    const decoded = StreamTransactionDecoder.decodeTransaction(singleTS.globals, txb) as DecodedCreateStream;
    expect(decoded?.type).toBe(StreamTransactionType.CREATE_STREAM);
    expect(decoded?.info).toEqual(expInfo);
    expect(decoded?.coinMerges.length).toBe(1);
    expect(decoded?.coinMerges[0].coinType).toBe(normalizeStructTag(SUI_TYPE_ARG));
    expect(decoded?.coinMerges[0].primary).toBe('GAS');
    expect(decoded?.coinMerges[0].merged).toBe(undefined);
  });

  it('single wallet, from payload', async () => {
    const defaultInfo = defaultStreamParam(await singleTS.globals.walletAddress());
    const expInfo: CreateStreamInfo = {
      ...defaultInfo,
      coinType: normalizeStructTag(defaultInfo.coinType),
    };
    const txb = await getCreateStreamTxb(singleTS.globals, expInfo);

    txb.setSender(singleTS.address);
    const txBytes = await txb.build({ client: singleTS.globals.suiClient });
    const txb2 = TransactionBlock.from(txBytes);

    const decoded = StreamTransactionDecoder.decodeTransaction(singleTS.globals, txb2) as DecodedCreateStream;
    expect(decoded?.type).toBe(StreamTransactionType.CREATE_STREAM);
    expect(decoded.info).toEqual(expInfo);
    expect(decoded.coinMerges.length).toBe(1);
  });
});

describe('decode other types of transactions', () => {
  let stream: Stream;
  let globals: Globals;

  beforeAll(async () => {
    const ts = await getTestSuite();
    const defaultInfo = defaultStreamParam(await ts.globals.walletAddress());
    const info: CreateStreamInfo = {
      ...defaultInfo,
      recipients: [defaultInfo.recipients[0]],
    };
    const client = new MPayClient(Env.dev);
    globals = client.globals;
    globals.connectWallet(new SingleWalletAdapter(ts.wallet, ts.globals.suiClient));
    const txb = await client.createStream(info);

    const res = await ts.wallet.signAndSubmitTransaction(txb);
    const streamIds = client.helper.getStreamIdsFromCreateStreamResponse(res);
    stream = await Stream.new(client.globals, streamIds[0]);
  });

  it('set auto claim true', async () => {
    const txb = await stream.setAutoClaim(true);
    const decoded = StreamTransactionDecoder.decodeTransaction(globals, txb) as DecodedSetAutoClaim;
    expect(decoded.type).toBe(StreamTransactionType.SET_AUTO_CLAIM);
    expect(decoded.enabled).toBe(true);
    expect(decoded.streamId).toBe(stream.streamId);
  });

  it('claim', async () => {
    const txb = await stream.claim();
    const decoded = StreamTransactionDecoder.decodeTransaction(globals, txb) as DecodedClaimStream;
    expect(decoded.type).toBe(StreamTransactionType.CLAIM);
    expect(decoded.streamId).toBe(stream.streamId);
  });

  it('claim by proxy', async () => {
    const txb = await stream.claimByProxy();
    const decoded = StreamTransactionDecoder.decodeTransaction(globals, txb) as DecodedClaimByProxy;
    expect(decoded.type).toBe(StreamTransactionType.CLAIM_BY_PROXY);
    expect(decoded.streamId).toBe(stream.streamId);
  });

  it('cancel', async () => {
    const txb = await stream.cancel();
    const decoded = StreamTransactionDecoder.decodeTransaction(globals, txb) as DecodedCancelStream;
    expect(decoded.type).toBe(StreamTransactionType.CANCEL);
    expect(decoded.streamId).toBe(stream.streamId);
  });
});

async function getCreateStreamTxb(globals: Globals, info: CreateStreamInfo) {
  const builder = new MPayBuilder(globals);
  return builder.createStreams(info);
}
