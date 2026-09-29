# `frontend/src/api/client.ts`

> Added in **patch 06** · [View the code](../../../../../frontend/src/api/client.ts) · Background: [Frontend data flow → axios](../../../../concepts/frontend-data-flow.md#2-axios-sending-requests)

## What it is for

Two things every API call needs:
1. `api`: **one configured axios client**, so no file ever writes a full URL.
2. `apiErrorMessage`: turns any failed request into a sentence for the user.

## The client

```ts
export const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
});
```
- `baseURL: '/api'`: `api.post('/auth/login')` goes to `/api/auth/login`. Because the path
  has no host, the request goes to the page's own server (Vite in development), whose proxy
  forwards it to the backend.
- `timeout`: give up after 30 seconds instead of waiting forever.

**Cookies:** the page and the API share one origin (thanks to the proxy), so the browser
attaches the `session` cookie to every request by itself. There's no token to add by hand.

## The error helper

```ts
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
```

Read it as a list of cases:
1. `axios.isAxiosError(error)`: is this a failed HTTP request (and not, say, a bug in our code)?
2. The backend always answers errors as `{ "error": "…" }` (the backend's
   [error handler](../../../backend/src/middleware/error-handler.ts.md)). If that text is
   there, show it: *Invalid email or password*, *Too many failed logins…*.
3. No response at all (network down), or a 5xx without our JSON (the backend isn't running,
   so Vite's proxy answers with an empty 500): say the server isn't responding.
4. Anything else: the `fallback` sentence chosen by the caller.

`fallback = 'Something went wrong'` is a **default parameter**: used when the caller
doesn't pass a second argument.

## Coming later

When a session expires while the app is open, every API call starts answering `401`. A
later patch adds an *interceptor* here: one function that sees every failed response and
sends the user back to the login page on a `401`.
