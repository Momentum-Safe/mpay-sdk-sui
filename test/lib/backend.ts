import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui.js/dist/cjs/utils/sui-types';

import { isSameCoinType } from '@/sui/utils';
import {
  BackendIncomingStreamFilterOptions,
  BackendOutgoingStreamFilterOptions,
  IBackend,
  Paginated,
  PaginationOptions,
  StreamEvent,
  StreamFilterStatus,
  StreamRef,
} from '@/types';

export class MockBackend implements IBackend {
  public inRefs: StreamRef[];

  public outRefs: StreamRef[];

  constructor() {
    this.inRefs = [];
    this.outRefs = [];
  }

  addStreamRef(...ref: StreamRef[]) {
    this.inRefs.push(...ref);
    this.outRefs.push(...ref);
  }

  addInStreamRef(...ref: StreamRef[]) {
    this.inRefs.push(...ref);
  }

  addOutStreamREf(...ref: StreamRef[]) {
    this.outRefs.push(...ref);
  }

  async getIncomingStreams(recipient: string, options?: BackendIncomingStreamFilterOptions): Promise<StreamRef[]> {
    return this.inRefs
      .filter((ref) => {
        if (options && options.coinType) {
          if (Array.isArray(options.coinType)) {
            return options.coinType.findIndex((coin) => isSameCoinType(ref.coinType, coin)) !== -1;
          }
          if (options.coinType) {
            return isSameCoinType(options.coinType, ref.coinType);
          }
        }
        return true;
      })
      .filter((ref) => {
        if (options && options.sender) {
          if (Array.isArray(options.sender)) {
            return options.sender.findIndex(
              (sender) => normalizeSuiAddress(sender) === normalizeSuiAddress(ref.sender),
            );
          }
          if (options.sender) {
            return normalizeSuiAddress(options.sender) === normalizeSuiAddress(ref.sender);
          }
        }
        return true;
      });
  }

  async getOutgoingStreams(sender: string, options?: BackendOutgoingStreamFilterOptions): Promise<StreamRef[]> {
    return this.outRefs
      .filter((ref) => {
        if (options && options.coinType) {
          if (Array.isArray(options.coinType)) {
            return options.coinType.findIndex((coin) => isSameCoinType(ref.coinType, coin)) !== -1;
          }
          if (options.coinType) {
            return isSameCoinType(options.coinType, ref.coinType);
          }
        }
        return true;
      })
      .filter((ref) => {
        if (options && options.recipient) {
          if (Array.isArray(options.recipient)) {
            return options.recipient.findIndex(
              (recipient) => normalizeSuiAddress(recipient) === normalizeSuiAddress(ref.recipient),
            );
          }
          if (options.recipient) {
            return normalizeSuiAddress(options.recipient) === normalizeSuiAddress(ref.recipient);
          }
        }
        return true;
      });
  }

  async getAllCoinTypes(address: string): Promise<string[]> {
    const refs: StreamRef[] = [];
    refs.push(...this.inRefs, ...this.outRefs);
    const coins = refs.reduce((s, ref) => {
      s.add(normalizeStructTag(ref.coinType));
      return s;
    }, new Set<string>());
    return Array.from(coins.keys());
  }

  async getAllRecipients(sender: string, options?: StreamFilterStatus): Promise<string[]> {
    const recipients = this.outRefs.reduce((s, ref) => {
      s.add(normalizeSuiAddress(ref.recipient));
      return s;
    }, new Set<string>());
    return Array.from(recipients.keys());
  }

  async getAllSenders(recipient: string, options?: StreamFilterStatus): Promise<string[]> {
    const senders = this.inRefs.reduce((s, ref) => {
      s.add(normalizeSuiAddress(ref.sender));
      return s;
    }, new Set<string>());
    return Array.from(senders.keys());
  }

  async getStreamHistory(query: {
    streamID?: string;
    groupID?: string;
    pagination?: PaginationOptions;
  }): Promise<Paginated<StreamEvent>> {
    return {
      data: [],
      pageNumber: 0,
      pageSize: 0,
      totalSize: 0,
    };
  }
}
