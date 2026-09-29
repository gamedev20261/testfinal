# `frontend/src/features/auth/LoginPage.tsx`

> Added in **patch 05** · [View the code](../../../../../../frontend/src/features/auth/LoginPage.tsx) · Background: [Forms](../../../../../concepts/forms.md), [React basics](../../../../../concepts/react-basics.md)

## What it is for

The **login screen**, rebuilt to look like the original: a white card on a light-blue
page, the logo, the title, two fields, the Sign In button, and a note that registration
happens in the Admin Portal.

In this patch it only **checks** what you type. When the form is valid it logs a line in
the browser console; patch 06 will send it to `POST /api/auth/login`.

![The login screen](../../../../patches/images/05-login.png)

## Where it lives

`features/auth/` holds everything about logging in. Screens are grouped by **feature**
(auth, admin, projects…), like the backend's `modules/` folder, so all the files for one
thing are together.

## The code, piece by piece

### 1. Set up the form

```tsx
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
```
`useForm` (from React Hook Form) creates the form's state and gives back the tools we need
([explained here](../../../../../concepts/forms.md#3-react-hook-form)):
- `register`: connects an input to a field.
- `handleSubmit`: wraps our submit function with validation.
- `errors`: the current message for each field.
- `isSubmitting`: `true` while submitting.

`resolver: zodResolver(loginSchema)` means "validate with [our Zod schema](login-schema.ts.md)".
`<LoginValues>` tells TypeScript the shape of the values.

### 2. What happens on a valid submit

```tsx
  function onSubmit(values: LoginValues) {
    console.log('Form is valid. Patch 06 will send it to POST /api/auth/login for', values.email);
  }
```
`handleSubmit(onSubmit)` only calls this when every field passed. For now it just logs.
We log the email, never the password.

### 3. The card and the header

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

### 4. The form

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

### 5. The button

```tsx
          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </Button>
```
`type="submit"` makes the click submit the form. While submitting, the button is disabled
and says *Signing in…*. You'll really see that in patch 06, when there's a server to wait for.

### 6. The footer note

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
| Errors only from the server, in a toast | Per-field messages before sending | Faster feedback, no pointless requests |
