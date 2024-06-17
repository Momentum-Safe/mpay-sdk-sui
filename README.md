# mpay-sdk-sui

SDK for MPay on Sui.

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

```ts
const txb = await client.createStreams(info);
const res = await wallet.signAndExecuteTransactionBlock(txb);
const streamIds = client.helper.getStreamIdsFromCreateStreamResponse(res);
if (streamIds === 1) {
    const streams = Stream.new(client.globals, streamIds[0]);
} else {
    const streamGroup = StreamGroup.new(client.globals, streamIds);
    const streams = streamGroup.streams;
}
```

### Stream detail information

```ts
const info = await stream.info;
console.log(info);

const progress = await stream.progress;
console.log(progress);
```

### Stream operations

```ts
// Cancel stream
const txb = await stream.cancel();
const res = await wallet.signAndExecuteTransactionBlock(txb);

// Claim stream
const txb = await stream.claim();
const res = await wallet.signAndExecuteTransactionBlock(txb);

// Set auto claim
const txb = await stream.setAutoClaim(true);
const res = await wallet.signAndExecuteTransactionBlock(txb);

// Claim by proxy
const txb = await stream.claimByProxy();
const res = await wallet.signAndExecuteTransactionBlock(txb);
```

### Stream list

**Incoming streams**

```ts
const it = await client.getIncomingStreams({
    status: 'STREAMING' | 'STREAMED',
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
    status: 'STREAMING' | 'STREAMED',
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
