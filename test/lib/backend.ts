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

export class EmptyBackend implements IBackend {
  async getIncomingStreams(recipient: string, options?: BackendIncomingStreamFilterOptions): Promise<StreamRef[]> {
    return [];
  }

  async getOutgoingStreams(sender: string, options?: BackendOutgoingStreamFilterOptions): Promise<StreamRef[]> {
    return [];
  }

  async getAllCoinTypes(address: string): Promise<string[]> {
    return [''];
  }

  async getAllRecipients(sender: string, options?: StreamFilterStatus): Promise<string[]> {
    return [];
  }

  async getAllSenders(recipient: string, options?: StreamFilterStatus): Promise<string[]> {
    return [];
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
