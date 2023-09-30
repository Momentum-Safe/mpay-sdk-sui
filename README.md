# mpay-sdk-sui
SDK for MPay on Sui

## Install

```shell
yarn add @msafe/mpay-sdk-sui
```

## Use SDK

### Initialize mpay client

```ts
import {MPayClient} from "@msafe/mpay-sdk-sui";

// Env.prod refer to mainnet environment
// Env.dev refer to testnet environment
// Env.unit refer to unit test environment
const client = new MPayClient(Env.prod)
```

### Connect a wallet

```ts
// Connect single signer wallet
client.connectSingleWallet(singleWallet);

// Connect MSafe multi-sig wallet (To be tested)
client.connectMSafeAccount(msafe)
```

### Create a stream

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

## Appendix 



### Deploy contract  (temp)

1. Clone [mpay-core-sui](git@github.com:Momentum-Safe/mpay-core-sui.git).
2. Change your sui profile to unit environment and use this environment.

```
  - alias: unit
    rpc: "http://ec2-54-241-42-141.us-west-1.compute.amazonaws.com:9000"
    ws: ~
```
3. Deploy to unit test environment 

```shell
yarn deploy-skip-test
```

### To generate transactions

1. Clone this repo
2. Copy `published/unit.json` from `mpay-core-sui` to this repo `config/unit.json`
2. `yarn install`
3. `yarn integration`

All kinds of transactions will be generated with printed transaction digest in terminal. 
Use the transaction for development or debugging process. 

