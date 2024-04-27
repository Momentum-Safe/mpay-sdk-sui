import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import {
  BackendIncomingStreamFilterOptions,
  BackendOutgoingStreamFilterOptions,
  IBackend,
  Paginated,
  PaginationOptions,
  StreamEvent,
  StreamEventDataDto,
  StreamEventDto,
  StreamFilterStatus,
  StreamRef,
} from '@/types';
import { addPrefix } from '@/utils';

export class Backend implements IBackend {
  constructor(private readonly apiUrl: string) { }

  async getIncomingStreams(recipient: string, options?: BackendIncomingStreamFilterOptions): Promise<StreamRef[]> {
    const query = {
      recipient,
      status: options?.status,
      coinTypes: options?.coinType,
      senders: options?.sender,
    };
    const res = await this.get('/stream/incoming', {
      params: query,
    });
    return res.data;
  }

  async getOutgoingStreams(sender: string, options?: BackendOutgoingStreamFilterOptions): Promise<StreamRef[]> {
    const query = {
      sender,
      status: options?.status,
      coinTypes: options?.coinType,
      recipients: options?.recipient,
    };
    const res = await this.get('/stream/outgoing', {
      params: query,
    });
    return res.data;
  }

  async getAllCoinTypes(address: string): Promise<string[]> {
    const res = await this.get('/stream/coin-types', {
      params: { address },
    });
    return res.data;
  }

  async getAllRecipients(sender: string, options?: StreamFilterStatus): Promise<string[]> {
    const res = await this.get('/stream/outgoing/recipients', {
      params: { sender, filter: options },
    });
    return res.data;
  }

  async getAllSenders(recipient: string, options?: StreamFilterStatus): Promise<string[]> {
    const res = await this.get('/stream/incoming/senders', {
      params: { recipient, filter: options },
    });
    return res.data;
  }

  async getStreamGroupByGroupId(groupId: string): Promise<{
    groupId: string;
    streamIds: string[];
  }> {
    const res = await this.get('/stream/ids', {
      params: { groupId },
    });
    return res.data;
  }

  async getStreamHistory(query: {
    streamId?: string;
    groupId?: string;
    pagination?: PaginationOptions;
  }): Promise<Paginated<StreamEvent>> {
    let res: AxiosResponse<any, any>;
    if (query.streamId) {
      res = await this.get('/stream/event/stream', {
        params: {
          streamAddress: query.streamId,
          page: query.pagination?.pageNumber,
          limit: query.pagination?.pageSize,
        },
      });
    } else if (query.groupId) {
      res = await this.get('/stream/event/group', {
        params: {
          groupId: query.groupId,
          page: query.pagination?.pageNumber,
          limit: query.pagination?.pageSize,
        },
      });
    } else {
      throw new Error('StreamId or GroupId need to be be provided');
    }
    return {
      data: res.data.data.map((dto: StreamEventDto) => this.parseEvent(dto)),
      pageNumber: res.data.meta.page,
      pageSize: res.data.meta.limit,
      totalSize: res.data.meta.total,
    };
  }

  private parseEvent(event: StreamEventDto): StreamEvent {
    return {
      streamId: event.streamId,
      createdAt: event.createdAt,
      sender: event.sender,
      txDigest: event.txDigest,
      data: this.parseStreamEventData(event.data),
    };
  }

  private parseStreamEventData(dto: StreamEventDataDto) {
    const eventType = dto.type;
    switch (eventType) {
      case 'create_stream':
        return {
          ...dto,
          balance: BigInt(dto.balance),
        };
      case 'cancel_stream':
        return {
          ...dto,
          withdrawAmount: BigInt(dto.withdrawAmount),
        };
      case 'claim':
      case 'auto_claim':
        return {
          ...dto,
          claimAmount: BigInt(dto.claimAmount),
        };
      case 'set_auto_claim':
        return dto;
      default:
        throw new Error(`Unknown stream event type: ${eventType}`);
    }
  }

  private async get<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R> {
    const fullUrl = this.getFullUrl(url);
    try {
      return await axios.get<T, R, D>(fullUrl, config);
    } catch (e: any) {
      throw BackendError.fromError(e) ?? e;
    }
  }

  private getFullUrl(url: string) {
    return url.startsWith(this.apiUrl) ? url : `${this.apiUrl}${addPrefix(url, '/')}`;
  }
}

export class BackendError extends Error {
  constructor(public readonly e: AxiosError) {
    super();
    this.name = 'Backend';
    Error.captureStackTrace(this, this.constructor);
  }

  public readonly name: string;

  static fromError(e: unknown) {
    if (axios.isAxiosError(e) && e?.response?.data && 'message' in e.response.data) {
      console.log(e.response.data);
      return new BackendError(e as AxiosError);
    }
    return undefined;
  }

  get status() {
    return this.e.response?.status ?? undefined;
  }

  get message(): string {
    return `Request to ${this.endpoint} failed: ${this.status} ${this.respMessage() ?? 'Unknown resp'}`;
  }

  private respMessage() {
    if (!this.e.response?.data) {
      return undefined;
    }
    return (this.e.response?.data as any).message ?? undefined;
  }

  get endpoint() {
    return this.e.config?.url ?? '';
  }

  toString() {
    return this.message;
  }
}
