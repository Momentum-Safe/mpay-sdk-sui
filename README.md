# mpay-sdk-sui
SDK for MPay on Sui

## Deploy (temp)

1. Clone [mpay-core-sui](git@github.com:Momentum-Safe/mpay-core-sui.git) and check out branch ` ME-875-Fix-test-cases-of-mpay-core-sui`
2. Change your sui profile to dev environment and use this environment.

```
  - alias: dev
    rpc: "http://ec2-13-52-78-128.us-west-1.compute.amazonaws.com:9000"
    ws: ~
```
3. Deploy to dev environment 

```shell
yarn deploy-skip-test
```

## To generate transactions

1. Clone this repo
2. Copy `published/dev.json` from `mpay-core-sui` to this repo `config/dev.json`
2. `yarn install`
3. `yarn integration`

All kinds of transactions will be generated with printed transaction digest in terminal. 
Use the transaction for development or debugging process. 

