import type { MPaySuiClient } from '@/sui/client';
import { toMpayCoin, MPayCoinStruct } from '@/sui/adapters';

import { NotEnoughBalanceError } from '@/error/NotEnoughBalanceError';
import { SanityError } from '@/error/SanityError';
import { EntryIterator, getAllFromIterator } from '@/sui/iterator/iterator';
import { Requester, PagedData } from '@/sui/iterator/requester';

const DEF_REQ_PAGE_SIZE = 25;

export async function getCoinsWithAmount(
  suiClient: MPaySuiClient,
  owner: string,
  requestAmount: bigint,
  coinType: string = '0x2::sui::SUI',
  pageSize: number = DEF_REQ_PAGE_SIZE,
) {
  const it = new OwnedCoinIterator(suiClient, owner, coinType, pageSize);
  let totalAmount = BigInt(0);
  const res: MPayCoinStruct[] = [];
  while ((await it.hasNext()) && totalAmount < requestAmount) {
    const val = await it.next();
    if (!val) {
      continue;
    }
    res.push(val);
    totalAmount += BigInt(val.balance);
  }
  if (totalAmount < requestAmount) {
    throw new NotEnoughBalanceError(coinType, requestAmount, totalAmount);
  }
  return res;
}

export async function getAllOwnedCoins(
  suiClient: MPaySuiClient,
  owner: string,
  coinType: string = '0x2::sui::SUI',
  pageSize: number = DEF_REQ_PAGE_SIZE,
) {
  const iter = new OwnedCoinIterator(suiClient, owner, coinType, pageSize);
  return (await getAllFromIterator(iter)) as MPayCoinStruct[];
}

export class OwnedCoinIterator extends EntryIterator<MPayCoinStruct> {
  constructor(
    private readonly suiClient: MPaySuiClient,
    private readonly owner: string,
    private readonly coinType: string,
    private readonly reqPageSize: number,
  ) {
    super(new OwnedCoinRequester(suiClient, owner, coinType, reqPageSize));
  }
}

export class OwnedCoinRequester implements Requester<MPayCoinStruct> {
  nextCursor: string | null | undefined;

  constructor(
    private readonly suiClient: MPaySuiClient,
    private readonly owner: string,
    private readonly coinType: string,
    private readonly reqPageSize: number,
  ) {
    if (reqPageSize <= 0) {
      throw new SanityError('Invalid reqPageSize');
    }
  }

  async doNextRequest(): Promise<PagedData<MPayCoinStruct>> {
    const previousCursor = this.nextCursor;
    const res = await this.suiClient.listCoins({
      owner: this.owner,
      coinType: this.coinType,
      cursor: this.nextCursor,
      limit: this.reqPageSize,
    });
    const nextCursor = res.cursor;
    // A repeated or missing cursor with hasNextPage would request the same page forever.
    const cursorAdvanced = nextCursor != null && nextCursor !== previousCursor;
    this.nextCursor = nextCursor;
    return {
      data: res.objects.map(toMpayCoin),
      hasNext: Boolean(res.hasNextPage) && cursorAdvanced,
    };
  }
}
