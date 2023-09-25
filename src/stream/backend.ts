import axios, { AxiosError, AxiosResponse } from 'axios';

import { BackendError } from '@/error/BackendError';
import {
  BackendOutgoingStreamFilterOptions,
  BackendIncomingStreamFilterOptions,
  IBackend,
  StreamFilterStatus,
  StreamRef,
} from '@/types/backend';
import { StreamEvent } from '@/types/events';
import { Paginated, PaginationOptions } from '@/types/pagination';

export class Backend implements IBackend {
  constructor(private apiURL: string) {}

  private static parseResponseData(response: AxiosError | AxiosResponse) {
    if (response instanceof AxiosError) {
      throw new BackendError(response.response?.statusText as string);
    }
    if (response.status === 200) {
      if (response.data.success) {
        return response.data.data;
      }
      throw new BackendError(response.data.code);
    }
    throw new BackendError(response.status.toString());
  }

  async getIncomingStreams(recipient: string, options?: BackendIncomingStreamFilterOptions): Promise<StreamRef[]> {
    if (options?.status === 'none') {
      return [];
    }
    const res = await axios.post(`${this.apiURL}/stream`, {
      recipient,
      ...options,
    });
    return Backend.parseResponseData(res) as StreamRef[];
  }

  async getOutgoingStreams(sender: string, options?: BackendOutgoingStreamFilterOptions): Promise<StreamRef[]> {
    if (options?.status === 'none') {
      return [];
    }
    const res = await axios.post(`${this.apiURL}/stream`, {
      sender,
      ...options,
    });
    return Backend.parseResponseData(res);
  }

  async getStreamHistory(query: {
    streamId?: string;
    groupId?: string;
    pagination?: PaginationOptions;
  }): Promise<Paginated<StreamEvent>> {
    const res = await axios.post(`${this.apiURL}/stream-events`, query);
    return Backend.parseResponseData(res);
  }

  async getAllCoinTypes(address: string): Promise<string[]> {
    const res = await axios.post(`${this.apiURL}/stream-info`, { address });
    return Backend.parseResponseData(res);
  }

  async getAllRecipients(sender: string, options?: StreamFilterStatus): Promise<string[]> {
    if (options === 'none') {
      return [];
    }
    const res = await axios.post(`${this.apiURL}/stream-info`, { sender, status: options });
    return Backend.parseResponseData(res);
  }

  async getAllSenders(recipient: string, options?: StreamFilterStatus): Promise<string[]> {
    if (options === 'none') {
      return [];
    }
    const res = await axios.post(`${this.apiURL}/stream-info`, { recipient, status: options });
    return Backend.parseResponseData(res);
  }
}
