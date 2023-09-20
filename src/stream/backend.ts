import axios, { AxiosError, AxiosResponse } from 'axios';

import {
  BackedOutgoingStreamFilterOptions,
  BackendIncomingStreamFilterOptions,
  IBackend,
  StreamRef,
} from '@/types/backend';
import { StreamEvent } from '@/types/events';
import { Paginated, PaginationOptions } from '@/types/pagination';

export class Backend implements IBackend {
  constructor(private apiURL: string) {}

  private static parseResponseData(response: AxiosError | AxiosResponse) {
    if (response instanceof AxiosError) {
      throw new Error(response.response?.statusText);
    }
    if (response.status === 200) {
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.code);
    }
    throw new Error(response.status.toString());
  }

  async getIncomingStreams(recipient: string, options?: BackendIncomingStreamFilterOptions): Promise<StreamRef[]> {
    const res = await axios.post(`${this.apiURL}/stream`, {
      recipient,
      ...options,
    });
    return Backend.parseResponseData(res) as any;
  }

  async getOutgoingStreams(sender: string, options?: BackedOutgoingStreamFilterOptions): Promise<StreamRef[]> {
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
}
