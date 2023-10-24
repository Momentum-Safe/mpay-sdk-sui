import { exec } from 'child_process';

import { SuiClient } from '@mysten/sui.js/client';
import { backOff } from 'exponential-backoff';

export async function requestFaucetForTestnet(client: SuiClient, recipient: string) {
  await executeFaucet(recipient);
  await waitForFaucet(client, recipient);
}

async function executeFaucet(recipient: string) {
  return new Promise((resolve, reject) => {
    const curlCommand = getFaucetCurlCommand(recipient);
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
      const res = JSON.parse(stdout);
      if (res.error !== null) {
        reject(new Error(`Unexpected response: ${res}`));
      }
      resolve(res);
    });
  });
}

async function waitForFaucet(client: SuiClient, recipient: string) {
  return backOff(async () => {
    const coins = await client.getCoins({
      owner: recipient,
    });
    if (coins.data.length === 0) {
      throw new Error('Address not fauceted yet');
    }
    return coins;
  });
}

function getFaucetCurlCommand(recipient: string) {
  return `curl --location --request POST 'https://faucet.testnet.sui.io/v1/gas' \
--header 'Content-Type: application/json' \
--data-raw '{
    "FixedAmountRequest": {
        "recipient": "${recipient}"
    }
}'`;
}
