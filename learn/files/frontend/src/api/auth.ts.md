# `frontend/src/api/auth.ts`

> Added in **patch 06** · [View the code](../../../../../frontend/src/api/auth.ts)

## What it is for

**One function per backend auth endpoint.** It's the only file in the frontend that knows
the auth URLs and the shapes of their requests and answers.

| Function | Request | Returns | Backend route |
|---|---|---|---|
| `authApi.login(email, password)` | `POST /api/auth/login` | the `User` | [login](../../../backend/src/modules/auth/auth.routes.ts.md) |
| `authApi.logout()` | `POST /api/auth/logout` | nothing | logout |
| `authApi.me()` | `GET /api/auth/me` | the `User`, or `null` | me |

These are exactly the requests you ran in Postman in patch 03.

## The code, piece by piece

```ts
export const authApi = {
  async login(email: string, password: string): Promise<User> {
    const { data } = await api.post<{ user: User }>('/auth/login', { email, password });
    return data.user;
  },
```
- `authApi` is an object whose properties are functions, which groups them under one name:
  `authApi.login(…)`.
- `api.post<{ user: User }>(url, body)`: send the body as JSON. The `<{ user: User }>` tells
  TypeScript the shape of `data` in the answer.
- `const { data } = …` takes `data` out of axios's response object (which also has
  `status`, `headers`…).
- If the server answers 401 or 429, axios **throws**, and the error travels to the caller
  (the login page shows it).

```ts
  async me(): Promise<User | null> {
    try {
      const { data } = await api.get<{ user: User }>('/auth/me');
      return data.user;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) return null;
      throw error;
    }
  },
```
For "who am I?", a `401` isn't a failure: it's a normal answer meaning **nobody is logged
in**. So we turn that one case into `null`. Any other error (server down) is re-thrown with
`throw error`, and the caller shows *The server could not be reached*.

> In the browser console you'll see red lines like
> `GET /api/auth/me 401 (Unauthorized)` whenever you're logged out. That's the browser
> reporting every 4xx response, and it's expected here, not a bug.
