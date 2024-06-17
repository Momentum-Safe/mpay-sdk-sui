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

## Deployed contracts

The latest deployed contracts information already in the config json file located at `config/*.json`

### Mainnet 

config/prod.json`
