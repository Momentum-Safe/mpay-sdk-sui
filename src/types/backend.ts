import { StreamEvent } from './events';
import { PaginationOptions } from './pagination';

/// StreamRef is the simplified stream info.
/// Full stream info shall be obtained from chain data. StreamRef is a brief for immutable stream
/// config info.
export interface StreamRef {
  groupID: string;
  streamID: string;
  sender: string;
  recipient: string;
  coinType: string;
}

/// Backend interface for supporting Stream registry query and history events.
export interface Backend {
  getIncomingStreams(recipient: string, options?: BackendStreamOptions): Promise<StreamRef[]>;
  getOutgoingStreams(sender: string, options?: BackendStreamOptions): Promise<StreamRef[]>;

  // TBD: Determined by whether all events can be queried from blockchain.
  getStreamHistory(query: {
    streamID?: string;
    streamIDs?: string[];
    pagination?: PaginationOptions;
  }): Promise<StreamEvent[]>;
}

// active - 'streamed', 'canceled', 'streaming'
// inactive - 'settled', 'completed'
export type StreamFilterStatus = 'active' | 'inactive' | 'all';

/// BackendStreamOptions Options for querying StreamRefs from backend.
/// Note that the pagination is currently not supported since the stream number
/// to displayed on frontend requires more complicated computation.
/// Shall add later.
export interface BackendStreamOptions {
  // Only show options for active / inactive status.
  status: StreamFilterStatus;

  // One or more coin types
  coinType: string | string[];
}
