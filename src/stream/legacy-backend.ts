import axios from 'axios';

import {
  BackendOutgoingStreamFilterOptions,
  BackendIncomingStreamFilterOptions,
  StreamFilterStatus,
  StreamRef,
  IBackend,
} from '@/types/backend';
import { StreamEvent } from '@/types/events';
import { Paginated, PaginationOptions } from '@/types/pagination';
import { parseResponseData } from '@/utils/backend';

export class LegacyBackend implements IBackend {
  constructor(private apiURL: string) {}

  async getIncomingStreams(recipient: string, options?: BackendIncomingStreamFilterOptions): Promise<StreamRef[]> {
    const res = await axios.post(`${this.apiURL}/stream`, {
      recipient,
      ...options,
    });
    return parseResponseData(res) as StreamRef[];
  }

  async getOutgoingStreams(sender: string, options?: BackendOutgoingStreamFilterOptions): Promise<StreamRef[]> {
    const res = await axios.post(`${this.apiURL}/stream`, {
      sender,
      ...options,
    });
    return parseResponseData(res);
  }

  async getStreamHistory(query: {
    streamId?: string;
    groupId?: string;
    pagination?: PaginationOptions;
  }): Promise<Paginated<StreamEvent>> {
    const res = await axios.post(`${this.apiURL}/stream-events`, query);
    const paginatedData = parseResponseData(res);
    paginatedData.data.forEach((event: StreamEvent) => {
      const formalizedEvent = event;
      if (formalizedEvent.data.type === 'create_stream') {
        formalizedEvent.data.balance = BigInt(formalizedEvent.data.balance);
      } else if (formalizedEvent.data.type === 'cancel_stream') {
        formalizedEvent.data.withdrawAmount = BigInt(formalizedEvent.data.withdrawAmount);
      } else if (formalizedEvent.data.type === 'claim' || formalizedEvent.data.type === 'auto_claim') {
        formalizedEvent.data.claimAmount = BigInt(formalizedEvent.data.claimAmount);
      } else if (formalizedEvent.data.type === 'set_auto_claim') {
        formalizedEvent.data.enabled = !!formalizedEvent.data.enabled;
      }
      formalizedEvent.createdAt = new Date(formalizedEvent.createdAt);
      return formalizedEvent;
    });

    return paginatedData;
  }

  async getAllCoinTypes(address: string): Promise<string[]> {
    const res = await axios.post(`${this.apiURL}/stream-info`, { address });
    return parseResponseData(res);
  }

  async getAllRecipients(sender: string, options?: StreamFilterStatus): Promise<string[]> {
    const res = await axios.post(`${this.apiURL}/stream-info`, { sender, status: options });
    return parseResponseData(res);
  }

  async getAllSenders(recipient: string, options?: StreamFilterStatus): Promise<string[]> {
    const res = await axios.post(`${this.apiURL}/stream-info`, { recipient, status: options });
    return parseResponseData(res);
  }
}
