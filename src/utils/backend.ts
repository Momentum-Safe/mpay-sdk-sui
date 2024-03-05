import { AxiosError, AxiosResponse } from 'axios';

import { BackendError } from '@/error/BackendError';

export function parseResponseData(response: AxiosError | AxiosResponse) {
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
