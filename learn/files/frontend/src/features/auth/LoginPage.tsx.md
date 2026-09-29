# `frontend/src/features/auth/LoginPage.tsx`

> Added in **patch 05** · Changed in **patch 06** (sends the form to the API) · [View the code](../../../../../../frontend/src/features/auth/LoginPage.tsx) · Background: [Forms](../../../../../concepts/forms.md), [React basics](../../../../../concepts/react-basics.md)

## What it is for

The **login screen**, rebuilt to look like the original: a white card on a light-blue
page, the logo, the title, two fields, the Sign In button, and a note that registration
happens in the Admin Portal.

It checks what you type (patch 05), then sends it to `POST /api/auth/login` (patch 06).
A wrong login shows the server's message in a red box; a correct one opens the start page.

| Empty | Wrong password (patch 06) |
|---|---|
| ![The login screen](../../../../../patches/images/05-login.png) | ![Wrong password](../../../../../patches/images/06-wrong-password.png) |

## Where it lives

`features/auth/` holds everything about logging in. Screens are grouped by **feature**
(auth, admin, projects…), like the backend's `modules/` folder, so all the files for one
thing are together.

## The code, piece by piece

### 1. Set up the form and the hooks

```tsx
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { data: user } = useCurrentUser();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
```
`useForm` (from React Hook Form) creates the form's state and gives back the tools we need
([explained here](../../../../../concepts/forms.md#3-react-hook-form)):
- `register`: connects an input to a field.
- `handleSubmit`: wraps our submit function with validation.
- `setError` *(patch 06)*: lets us add an error ourselves (the server's answer).
- `errors`: the current message for each field.
- `isSubmitting`: `true` while `onSubmit` runs, including while we wait for the server.

`resolver: zodResolver(loginSchema)` means "validate with [our Zod schema](login-schema.ts.md)".

The four hooks added in patch 06:
- `useCurrentUser()`: who is logged in (from the cache, [use-auth.ts](use-auth.ts.md)).
- `useLogin()`: the login mutation.
- `useNavigate()`: a function to change page from code.
- `useLocation()`: the current URL, and the `state` that [`RequireAuth`](RequireAuth.tsx.md)
  may have attached.

### 2. Where to go after logging in

```tsx
  const from: string = location.state?.from ?? '/';
```
If `RequireAuth` sent us here from a protected page, it left `{ from: '/that/page' }` in the
location state; go back there. Otherwise (you opened `/login` directly) go to `/`.

### 3. What happens on a valid submit

```tsx
  async function onSubmit(values: LoginValues) {
    try {
      await login.mutateAsync(values);
      navigate(from, { replace: true });
    } catch (error) {
      setError('root', { message: apiErrorMessage(error, 'Could not sign in') });
    }
  }
```
`handleSubmit(onSubmit)` only calls this when every field passed. Then:
1. `await login.mutateAsync(values)` sends `POST /api/auth/login` and **waits**. While it
   waits, `isSubmitting` is `true`, so the button shows *Signing in…* and is disabled
   (no double submit). On success, `useLogin` stores the user in the cache.
2. `navigate(from, { replace: true })` opens the start page. `replace` means the Back button
   won't return to the login page.
3. If the server refused (401, 429) or couldn't be reached, `mutateAsync` **throws**, and
   `catch` stores the message as a *root* error: an error about the whole form rather than
   one field. [`apiErrorMessage`](../../api/client.ts.md) picks the server's sentence,
   e.g. *Invalid email or password*.

React Hook Form clears root errors on the next submit, so the red box disappears as soon as
you try again.

### 4. Already logged in?

```tsx
  if (user) {
    return <Navigate to={from} replace />;
  }
```
Opening `/login` while logged in makes no sense, so redirect. This `if` comes **after all
the hooks**: hooks must run in the same order on every render, so none may sit below an
early `return`.

### 5. The card and the header

```tsx
    <main className="flex min-h-screen items-center justify-center bg-primary-light p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-white p-8 shadow-lg">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-white">G</span>
          </div>
          <h1 className="text-2xl font-bold text-primary">GeoAnnotator</h1>
          <p className="mt-1 text-xs text-text-secondary">Information Extraction System</p>
        </header>
```
The same classes as the original login page: a page-filling light-blue background with the
card centred, a 48×48 px blue square with a white "G" (`h-12 w-12`, `mx-auto` centres it),
then the title and subtitle.

### 6. The form

```tsx
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
```
- `onSubmit={handleSubmit(onSubmit)}`: runs on the button click **and** on Enter in any field.
- `noValidate`: turn off the browser's own pop-up bubbles; our messages replace them.
- `space-y-4`: 16px between the fields.

```tsx
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="name@organization.com"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
          </FormField>
```
- [`FormField`](../../components/ui/FormField.tsx.md) adds the label and the error message.
- `errors.email?.message`: the message, or `undefined` when the email is fine.
- `aria-invalid` / `aria-describedby`: set **only when there is an error**. `undefined`
  removes the attribute entirely. They make the border red ([`Input`](../../components/ui/Input.tsx.md))
  and let screen readers read the error.
- `{...register('email')}`: connects this input to the `email` field.

The password field is the same, with `type="password"` (dots instead of letters) and
`autoComplete="current-password"`.

### 7. The server's error, and the button

```tsx
          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </Button>
```
`type="submit"` makes the click submit the form. While submitting, the button is disabled
and says *Signing in…*.

Just above the button, the server's message (patch 06):

```tsx
          {errors.root && (
            <p role="alert" className="rounded border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              {errors.root.message}
            </p>
          )}
```
A light-red box, drawn only when there is a root error. `bg-danger/5` = our red at 5%
opacity. `role="alert"` makes screen readers announce it.

### 8. The footer note

```tsx
          User registration is restricted to the{' '}
          <span className="font-medium text-text-primary">Admin Portal</span>.
```
`{' '}` is an explicit space. JSX drops spaces at the end of a line, and without it the
text would read "to theAdmin Portal".

## Differences from the original

| Original | Now | Why |
|---|---|---|
| Label "Username or Email" | "Email" | Only email login exists (in both versions) |
| `useState` for the fields, manual `onChange` | React Hook Form + Zod | Validation with clear per-field messages; less code |
| Errors only from the server, in a toast | Per-field messages before sending, server errors in a box above the button | Faster feedback, no pointless requests; the message stays visible next to the form |
| After login: annotators → task list, others → home | Everyone → `/` (or the page they came from) | The portals don't exist yet; each role gets its landing page when its portal is built |
