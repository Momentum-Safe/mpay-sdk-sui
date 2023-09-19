import { TransactionBlock } from '@mysten/sui.js/transactions';

import { Globals } from '@/common/globals';
import { MoveObject } from '@/transaction/contracts/common';
import { CLOCK_ID } from '@/transaction/contracts/const';

export class ContractCall {
  constructor(
    public readonly txb: TransactionBlock,
    public readonly globals: Globals,
  ) {}

  async execute() {
    await this.globals.wallet.execute(this.txb);
  }

  async inspect() {
    return this.globals.wallet.inspect(this.txb);
  }

  static clockObject() {
    return new MoveObject(CLOCK_ID);
  }
}
