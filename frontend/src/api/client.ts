import axios from 'axios';

// One configured HTTP client for every API call.
// '/api/auth/login' becomes api.post('/auth/login'). The browser adds the session cookie by itself.
export const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
});

// A 401 on any normal request means the session ended (expired, or the password changed elsewhere).
// Forgetting the user makes RequireAuth send the browser to the login page.
let onSessionEnded = () => {};
export const setSessionEndedHandler = (handler: () => void) => (onSessionEnded = handler);

api.interceptors.response.use(undefined, (error) => {
  const url: string = error.config?.url ?? '';
  if (error.response?.status === 401 && !url.startsWith('/auth/')) onSessionEnded();
  return Promise.reject(error);
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
