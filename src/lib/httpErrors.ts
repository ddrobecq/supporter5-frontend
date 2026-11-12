import axios from 'axios';

/** True when the request reached the server and it answered 404 (resource does not exist). */
export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

/** True when the request was cancelled (AbortController / unmount), which is not a real failure. */
export function isAbortError(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  if (error instanceof Error) return error.name === 'CanceledError' || error.name === 'AbortError';
  return false;
}
