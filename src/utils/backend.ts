import { AxiosError, AxiosResponse } from 'axios';

import { BackendError } from '@/error/BackendError';

export function parseResponseData(response: AxiosError | AxiosResponse) {
  if (response instanceof AxiosError) {
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
    throw new BackendError(body.code);
  }
  throw new BackendError(response.status.toString());
}
