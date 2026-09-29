import axios from 'axios';

// One configured HTTP client for every API call.
// '/api/auth/login' becomes api.post('/auth/login'). The browser adds the session cookie by itself.
export const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
});

// Turns any failed request into a sentence we can show to the user.
// The backend always answers errors as { "error": "..." }.
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error;
    if (typeof message === 'string') return message;
    if (!error.response || error.response.status >= 500) {
      return 'The server is not responding. Please try again in a moment.';
    }
  }
  return fallback;
}
