/**
 * Network error detection utilities.
 * Detects when an API error is caused by network issues (offline, DNS failure,
 * server unreachable) vs. a genuine server error response.
 */

const NETWORK_ERROR_MESSAGE =
  'No internet connection. Please check your network and try again.';

const SERVER_UNREACHABLE_MESSAGE =
  'Unable to reach the server. Please check your connection or try again later.';

/**
 * Returns true if the axios error is a network-level failure
 * (no response received from the server at all).
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  // Axios sets error.response only when the server actually responds.
  // If error.response is undefined, the request never reached the server.
  if (!error.response) {
    // Axios sets error.code for low-level issues
    if (
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ERR_CONNECTION_REFUSED' ||
      error.message === 'Network Error'
    ) {
      return true;
    }
    // Also check if the browser itself reports offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return true;
    }
    // Generic: no response and no explicit cancel — treat as network error
    if (!error.__CANCEL__) {
      return true;
    }
  }
  return false;
}

/**
 * Returns a user-friendly error message.
 * If the error is a network error, returns a connectivity message.
 * Otherwise returns the server error or the provided fallback.
 */
export function getErrorMessage(error: any, fallback: string): string {
  if (isNetworkError(error)) {
    return typeof navigator !== 'undefined' && !navigator.onLine
      ? NETWORK_ERROR_MESSAGE
      : SERVER_UNREACHABLE_MESSAGE;
  }
  return error?.response?.data?.error || error?.response?.data?.message || fallback;
}

export { NETWORK_ERROR_MESSAGE, SERVER_UNREACHABLE_MESSAGE };
