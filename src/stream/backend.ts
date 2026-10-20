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

const REQUEST_TIMEOUT_MS = 30_000;

// Match axios's default query encoder so indexer filters stay on the same URLs.
function encodeAxiosComponent(value: string): string {
  return encodeURIComponent(value)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']');
}

function appendQueryValue(parts: string[], key: string, value: unknown) {
  if (value === undefined || value === null) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryValue(parts, `${key}[]`, item));
    return;
  }
  parts.push(`${encodeAxiosComponent(key)}=${encodeAxiosComponent(String(value))}`);
}

function buildIndexerUrl(url: string, params?: Record<string, unknown>): string {
  if (!params) {
    return url;
  }
  const parts: string[] = [];
  Object.entries(params).forEach(([key, value]) => appendQueryValue(parts, key, value));
  if (parts.length === 0) {
    return url;
  }
  return `${url}?${parts.join('&')}`;
}

async function indexerHttpError(url: string, response: Response): Promise<Error> {
  let message: string | undefined;
  const text = await response.text();
  if (text) {
    try {
      const body = JSON.parse(text) as { message?: unknown };
      if (typeof body?.message === 'string') {
        message = body.message;
      }
    } catch {
      message = undefined;
    }
  }
  if (message) {
    const error = new Error(`Request to ${url} failed: ${response.status} ${message}`);
    error.name = 'Backend';
    return error;
  }
  return new Error(`Request failed with status code ${response.status}`);
}

export class Backend implements IBackend {
  constructor(private readonly apiUrl: string) {}

  async getIncomingStreams(recipient: string, options?: BackendIncomingStreamFilterOptions): Promise<StreamRef[]> {
    const query = {
      recipient,
      status: options?.status,
      coinTypes: options?.coinType,
      senders: options?.sender,
    };
    const res = await this.get<StreamRef[]>('/stream/incoming', query);
    return res.data;
  }

  async getOutgoingStreams(sender: string, options?: BackendOutgoingStreamFilterOptions): Promise<StreamRef[]> {
    const query = {
      sender,
      status: options?.status,
      coinTypes: options?.coinType,
      recipients: options?.recipient,
    };
    const res = await this.get<StreamRef[]>('/stream/outgoing', query);
    return res.data;
  }

  async getAllCoinTypes(address: string): Promise<string[]> {
    const res = await this.get<string[]>('/stream/coin-types', { address });
    return res.data;
  }

  async getAllRecipients(sender: string, options?: StreamFilterStatus): Promise<string[]> {
    const res = await this.get<string[]>('/stream/outgoing/recipients', { sender, filter: options });
    return res.data;
  }

  async getAllSenders(recipient: string, options?: StreamFilterStatus): Promise<string[]> {
    const res = await this.get<string[]>('/stream/incoming/senders', { recipient, filter: options });
    return res.data;
  }

  async getStreamGroupByGroupId(groupId: string): Promise<{
    groupId: string;
    streamIds: string[];
  }> {
    const res = await this.get<{ groupId: string; streamIds: string[] }>('/stream/ids', { groupId });
    return res.data;
  }

  async getStreamHistory(query: {
    streamId?: string;
    groupId?: string;
    pagination?: PaginationOptions;
  }): Promise<Paginated<StreamEvent>> {
    let res: { data: unknown };
    if (query.streamId) {
      res = await this.get('/stream/event/stream', {
        streamAddress: query.streamId,
        page: query.pagination?.pageNumber,
        limit: query.pagination?.pageSize,
      });
    } else if (query.groupId) {
      res = await this.get('/stream/event/group', {
        groupId: query.groupId,
        page: query.pagination?.pageNumber,
        limit: query.pagination?.pageSize,
      });
    } else {
      throw new Error('StreamId or GroupId need to be be provided');
    }
    const body = res.data as
      | {
          data?: StreamEventDto[];
          meta?: { page: number; limit: number; total: number };
        }
      | undefined;
    if (!body || !Array.isArray(body.data) || !body.meta) {
      throw new Error('Stream history response is missing data');
    }
    return {
      data: body.data.map((dto: StreamEventDto) => this.parseEvent(dto)),
      pageNumber: body.meta.page,
      pageSize: body.meta.limit,
      totalSize: body.meta.total,
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

  private async get<T>(url: string, params?: Record<string, unknown>): Promise<{ data: T }> {
    const fullUrl = buildIndexerUrl(this.getFullUrl(url), params);
    let response: Response;
    try {
      response = await fetch(fullUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error(`timeout of ${REQUEST_TIMEOUT_MS}ms exceeded`);
      }
      throw error;
    }
    if (!response.ok) {
      throw await indexerHttpError(fullUrl, response);
    }
    return { data: (await response.json()) as T };
  }

  private getFullUrl(url: string) {
    return url.startsWith(this.apiUrl) ? url : `${this.apiUrl}${addPrefix(url, '/')}`;
  }
}
