import { StreamEvent } from '@/types/events';
import { Paginated, PaginationOptions } from '@/types/pagination';

/// StreamRef is the simplified stream info.
/// Full stream info shall be obtained from chain data. StreamRef is a brief for immutable stream
/// config info.
export interface StreamRef {
  groupID: string;
  streamID: string;
  sender: string;
  recipient: string;
  coinType: string;
  createDate: Date;
}

/// Backend interface for supporting Stream registry query and history events.
export interface Backend {
  getIncomingStreams(recipient: string, options?: BackendIncomingStreamFilterOptions): Promise<StreamRef[]>;
  getOutgoingStreams(sender: string, options?: BackedOutgoingStreamFilterOptions): Promise<StreamRef[]>;

  getStreamHistory(query: {
    streamID?: string;
    groupID?: string;
    pagination?: PaginationOptions;
  }): Promise<Paginated<StreamEvent>>;
}

// StreamFilterStatus only applies for active / inactive status.
// SDK will do the filtering for streams.
// active - 'streamed', 'canceled', 'streaming'
// inactive - 'settled', 'completed'
export type StreamFilterStatus = 'active' | 'inactive' | 'all';

/// BackendIncomingStreamFilterOptions Options for querying Incoming StreamRefs from backend.
/// Note that the pagination is currently not supported since the stream number
/// to displayed on frontend requires more complicated computation.
/// Shall add later.
export interface BackendIncomingStreamFilterOptions {
  status?: StreamFilterStatus;

  // One or more coin types
  coinType?: string | string[];

  sender?: string | string[];
}

/// BackedOutgoingStreamFilterOptions Options for querying Outgoing StreamRefs from backend.
export interface BackedOutgoingStreamFilterOptions {
  status?: StreamFilterStatus;

  coinType?: string | string[];

  recipient?: string | string[];
}
