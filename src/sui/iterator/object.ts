import type { MPaySuiClient } from '@/sui/client';
import { getMpayObjects, MPayObjectResponse } from '@/sui/adapters';

import { EntryIterator, getAllFromIterator, SuiIterator } from '@/sui/iterator/iterator';
import { PagedData, Requester } from '@/sui/iterator/requester';

export type ObjectFilter = (objRes: MPayObjectResponse) => boolean;

export const REQUEST_PAGE_SIZE = 25;

// OidIter is the iterator to give the list of object ids
export type OidIter = SuiIterator<string>;
export interface BatchObjectOptions {
  filter?: ObjectFilter;
  pageSize?: number;
}

// getObjectsById get the list of objects by id.
// Compared with the multiGetObject method defined by SUI, this method will do the pagination
// for get object requests.
export async function getObjectsById(
  suiClient: MPaySuiClient,
  ids: string[],
  options?: BatchObjectOptions,
): Promise<(MPayObjectResponse | undefined)[]> {
  const oidIter = new ListOidIterator(ids);
  const iter = new ObjectBatchIterator(suiClient, oidIter, options);
  return (await getAllFromIterator(iter)) as MPayObjectResponse[];
}

// ListOidIterator is the iterator that iterate through a list of ids.
// This iterator shall be used when the number requested objects is big
// which is inappropriate to fit the requested objects into a single
// request.
export class ListOidIterator implements OidIter {
  cursor: number;

  constructor(public readonly ids: string[]) {
    this.cursor = -1;
  }

  async hasNext(): Promise<boolean> {
    return this.cursor < this.ids.length - 1;
  }

  async next(): Promise<string> {
    this.cursor += 1;
    if (this.cursor >= this.ids.length) {
      throw new Error('invalid iterator implementation'); // Shall be unreachable
    }
    return this.ids[this.cursor];
  }
}

export class ObjectBatchIterator extends EntryIterator<MPayObjectResponse> {
  constructor(
    public readonly suiClient: MPaySuiClient,
    public readonly idIter: OidIter,
    public readonly options?: BatchObjectOptions,
  ) {
    super(new ObjectBatchRequester(suiClient, idIter, options));
  }
}

// TODO: Unit test this class
export class ObjectBatchRequester implements Requester<MPayObjectResponse> {
  filter: ObjectFilter | undefined;

  pageSize: number;

  constructor(
    public readonly suiClient: MPaySuiClient,
    public readonly stringIter: OidIter,
    public options?: BatchObjectOptions,
  ) {
    this.filter = options?.filter;
    this.pageSize = options?.pageSize || REQUEST_PAGE_SIZE;
  }

  async doNextRequest(): Promise<PagedData<MPayObjectResponse>> {
    const requestPage: string[] = [];
    while (requestPage.length < this.pageSize) {
      const hasNext = await this.stringIter.hasNext();
      if (!hasNext) {
        break;
      }
      const objId = await this.stringIter.next();
      if (objId) {
        requestPage.push(objId);
      }
    }
    const res = await getMpayObjects(this.suiClient, requestPage);
    let filtered: MPayObjectResponse[];
    if (this.filter) {
      const { filter } = this;
      filtered = res.filter((r: MPayObjectResponse) => filter?.(r));
    } else {
      filtered = res;
    }
    return {
      data: filtered,
      hasNext: await this.stringIter.hasNext(),
    };
  }
}
