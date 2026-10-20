import axios from 'axios';

import { BackendError } from '@/error/BackendError';
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

const REQUEST_TIMEOUT_MS = 30_000;

export class LegacyBackend implements IBackend {
  constructor(private apiURL: string) {}

  private post(path: string, data?: unknown) {
    return axios.post(`${this.apiURL}${path}`, data, { timeout: REQUEST_TIMEOUT_MS });
  }

  async getStreamGroupByGroupId(groupId: string): Promise<{
    groupId: string;
    streamIds: string[];
  }> {
    const res = await this.post('/stream-group', { groupId });
    return parseResponseData(res);
  }

  async getIncomingStreams(recipient: string, options?: BackendIncomingStreamFilterOptions): Promise<StreamRef[]> {
    const res = await this.post('/stream', {
      recipient,
      ...options,
    });
    return parseResponseData(res) as StreamRef[];
  }

  async getOutgoingStreams(sender: string, options?: BackendOutgoingStreamFilterOptions): Promise<StreamRef[]> {
    const res = await this.post('/stream', {
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
    const res = await this.post('/stream-events', query);
    const paginatedData = parseResponseData(res);
    if (!paginatedData || !Array.isArray(paginatedData.data)) {
      throw new BackendError('Stream history response is missing data');
    }
    paginatedData.data.forEach((event: StreamEvent) => {
      const formalizedEvent = event;
      if (!formalizedEvent?.data) {
        throw new BackendError('Stream event is missing data');
      }
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
    const res = await this.post('/stream-info', { address });
    return parseResponseData(res);
  }

  async getAllRecipients(sender: string, options?: StreamFilterStatus): Promise<string[]> {
    const res = await this.post('/stream-info', { sender, status: options });
    return parseResponseData(res);
  }

  async getAllSenders(recipient: string, options?: StreamFilterStatus): Promise<string[]> {
    const res = await this.post('/stream-info', { recipient, status: options });
    return parseResponseData(res);
  }
}
