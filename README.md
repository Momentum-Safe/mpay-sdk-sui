# mpay-sdk-sui

## 项目介绍

`@msafe/mpay-sdk-sui` 是 Sui 上流支付（MPay）的 TypeScript SDK。MSafe 多签钱包、`msafe-sui-web-v3` 和独立的 stream payment dApp（`pay.m-safe.io`）用它创建、领取、取消流支付，并读取链上 `Stream` 对象。SDK 返回未签名的 `Transaction`，由 MSafe 多签完成模拟、投票和执行。流支付和 Momentum DEX 是两条产品线，本 SDK 只组流支付交易。

技术栈是 TypeScript、tsup、Jest，以及 `@mysten/sui` 的 gRPC 客户端。入口是 `src/index.ts`，业务门面是 `src/stream/client.ts` 的 `MPayClient`。建交易在 `src/transaction/builder/MPayBuilder.ts`，主网和测试网的 package / 共享对象写在 `config/prod.json` 与 `config/dev.json`。

## Install

```shell
yarn add @msafe/mpay-sdk-sui
```

## Use SDK

For SDK integration example, please check out Github repository [mpay-example](https://github.com/Momentum-Safe/mpay-example).

### Initialize mpay client

```ts
import {MPayClient} from "@msafe/mpay-sdk-sui";

// Env.prod refer to mainnet environment
// Env.dev refer to testnet environment
const client = new MPayClient(Env.prod)
```

### Connect a wallet

```ts
// Connect single signer wallet
client.connectSingleWallet(singleWallet);

// Connect MSafe multi-sig wallet (To be tested)
client.connectMSafeAccount(msafe)
```

### Create a stream or a stream group

`createStream` returns an unsigned `Transaction`. The caller signs it with the connected wallet. `Stream.new` and `StreamGroup.new` are async.

```ts
const tx = await client.createStream(info);
const res = await wallet.signAndExecuteTransaction({ transaction: tx });
const streamIds = client.helper.getStreamIdsFromCreateStreamResponse(res);
if (streamIds.length === 1) {
    const stream = await Stream.new(client.globals, streamIds[0]);
} else {
    const streamGroup = await StreamGroup.new(client.globals, streamIds);
    const streams = streamGroup.streams;
}
```

### Stream detail information

`info` and `progress` are synchronous getters.

```ts
const info = stream.info;
console.log(info);

const progress = stream.progress;
console.log(progress);
```

### Stream operations

Each method returns an unsigned `Transaction`.

```ts
const cancelTx = await stream.cancel();
const claimTx = await stream.claim();
const autoClaimTx = await stream.setAutoClaim(true);
const proxyClaimTx = await stream.claimByProxy();
```

### Stream list

**Incoming streams**

```ts
const it = await client.getIncomingStreams({
    status: 'STREAMING', // STREAMING | COMPLETED | CANCELED | SETTLED
    sender: someSender,
});

while (await it.hasNext()) {
    const sts = await it.next();
    sts.forEach((st) => {
        if (st.type === 'Stream') {
            console.log((st as Stream).info);
        } else if (st.type === 'StreamGroup') {
            console.log((st as StreamGroup).info);
        }
    })
}
```

**Outgoing streams**

```ts
const it = await client.getOutgoingStreams({
    status: 'STREAMING', // STREAMING | COMPLETED | CANCELED | SETTLED
    recipient: someAddress,
});

while (await it.hasNext()) {
    const sts = await it.next();
    sts.forEach((st) => {
        if (st.type === 'Stream') {
            console.log((st as Stream).info);
        } else if (st.type === 'StreamGroup') {
            console.log((st as StreamGroup).info);
        }
    })
}
```

## Deployed contracts and objects

The latest deployed contracts information already in the config json file located at `config/*.json`

### Mainnet 

| **Field**          | **ID**                                                                                             |
|--------------------|----------------------------------------------------------------------------------------------------|
| contractId         | 0xc357c3985e8fb875d6b37141497af660779aa1bab0ec489b2213efd74067d1fa                                  |
| roleObjId          | 0x5ab49bdf9fd1413e328ef242b3f8d83dde791b38a0b627bfc87fb25c010d34f1                                  |
| vaultObjId         | 0xb483558770d8eb26007f193b75db40f0a45f2e36863a687625885d4de6993378                                  |
| feeObjId           | 0x48453fc4d7cde3fe35aad89e5dfb496608a6a55ea529a1c0274681a808627f94                                  |
| upgradeCapObjId    | 0x34279779a0d0d36bd5044b04830d607fa1b0ecf316548c8ac3a44151e4f1a42a                                  |

### Testnet

| **Field**          | **ID**                                                                                             |
|--------------------|----------------------------------------------------------------------------------------------------|
| contractId         | `0x81c960dc653975fbd0072deca8afb92d322898c911622898ba1b2e3ad0c4bd8d`                               |
| roleObjId          | `0xc6ec0bdee0bb59a72077e9acd2f42457043cf47080b3d3fad4d39abf28bba63a`                               |
| vaultObjId         | `0xbc4021387fbac149119fd24e92be9e58f745774292f3a2a12e2ac6daf5363e1d`                               |
| feeObjId           | `0x4178f63970fe2daeb256dc5730ad172e82b3e8eb45f31b33e0daae72cd35e1e1`                               |
| upgradeCapObjId    | `0xe1e9aa7d222d151bfe6dd83358b0d7fdcb11260f710800cfaf7ccc1b1e245115`                               |
