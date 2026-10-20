import { BackendError } from '@/error/BackendError';

// Structural shape of an axios response or error. Kept local so the package entry does not import axios.
type LegacyHttpResult = {
  isAxiosError?: boolean;
  response?: { statusText?: string };
  status?: number;
  data?: { success?: boolean; data?: unknown; code?: string } | null;
};

export function parseResponseData(response: LegacyHttpResult) {
  if (response.isAxiosError) {
    throw new BackendError(response.response?.statusText as string);
  }
  if (response.status === 200) {
    const body = response.data;
    if (!body || typeof body !== 'object') {
      throw new BackendError('Missing response body');
    }
    if (body.success) {
      return body.data;
    }
    throw new BackendError(body.code ?? '');
  }
  throw new BackendError(String(response.status));
}
