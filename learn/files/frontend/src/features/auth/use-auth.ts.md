# `frontend/src/features/auth/use-auth.ts`

> Added in **patch 06** · [View the code](../../../../../../frontend/src/features/auth/use-auth.ts) · Background: [TanStack Query](../../../../../concepts/frontend-data-flow.md#3-tanstack-query-server-data-in-components)

## What it is for

Three **hooks** that pages use for everything about the session. Pages never call
`authApi` directly; they call these hooks, which also keep the cache up to date.

| Hook | Used by | Gives |
|---|---|---|
| `useCurrentUser()` | `RequireAuth`, `LoginPage`, `HomePage` | `{ data: user, isPending, isError, refetch }` |
| `useLogin()` | `LoginPage` | `{ mutateAsync, isPending }` |
| `useLogout()` | `HomePage` (later: the top bar's menu) | `{ mutate, isPending }` |

A **custom hook** is just a function whose name starts with `use` and which calls other
hooks. It lets several components share the same logic.

## The code, piece by piece

### The cache key

```ts
export const currentUserKey = ['auth', 'me'] as const;
```
The name of "the logged-in user" in the cache. Defined once, so a typo can't create a
second, different entry.

### Who is logged in?

```ts
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: authApi.me,
  });
}
```
Asks `GET /api/auth/me` once and shares the answer with every component that calls this
hook. `data` is:
- `undefined` while the first answer is on its way (`isPending` is `true`);
- a `User` when logged in;
- `null` when nobody is logged in ([`authApi.me`](../../api/auth.ts.md) turns the 401 into `null`).

### Log in

```ts
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (user) => queryClient.setQueryData(currentUserKey, user),
  });
}
```
- `useQueryClient()` gives access to the cache from [`query-client.ts`](../../lib/query-client.ts.md).
- `mutationFn`: what to run when the page calls `login.mutateAsync({ email, password })`.
- `onSuccess`: the server answered with the user, so we **write it straight into the cache**
  under "who is logged in?". Every component using `useCurrentUser()` updates immediately,
  and `RequireAuth` lets us through without asking `/me` again.

### Log out

```ts
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}
```
- `onSettled` runs **whether the request succeeded or failed**. Even if the server couldn't
  be reached, the user asked to leave, so we leave.
- `queryClient.clear()` forgets **everything** cached for this user. In later screens that
  includes projects and users, so the next person to log in on this browser never sees them.
- `navigate('/login', { replace: true })` goes to the login page; `replace` stops the Back
  button from returning to the logged-in page.
