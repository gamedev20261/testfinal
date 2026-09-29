# Forms in React: inputs, validation and accessibility

## 1. What a form has to do

A login form looks simple, but it has a lot of jobs:
1. Remember what the user typed.
2. Check it (*validate*) and show a clear message next to each wrong field.
3. On submit: stop the browser's default behaviour (reloading the page), and send the data.
4. Show that it's busy while sending (disable the button: no double submits).
5. Show the server's answer ("Invalid email or password").
6. Work with the keyboard and screen readers.

## 2. The browser's default submit

```html
<form>
  <input name="email" />
  <button type="submit">Sign In</button>
</form>
```
Pressing *Enter* in an input, or clicking a `type="submit"` button, **submits** the form.
By default the browser then *navigates to a new page*, the old way the web worked. In a
React app we cancel that (`event.preventDefault()`) and send the data with JavaScript
ourselves. React Hook Form's `handleSubmit` does this for us.

## 3. React Hook Form

Writing all of that by hand with `useState` gets long and repetitive (see the original
app's `LoginPage`). **React Hook Form** handles it:

```tsx
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
});

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('email')} />
  {errors.email && <p>{errors.email.message}</p>}
</form>
```

| Piece | What it does |
|---|---|
| `register('email')` | Connects an input to the form field `email`. It returns props (`name`, `onChange`, `onBlur`, `ref`) that we spread onto the input with `{...}`. |
| `handleSubmit(onSubmit)` | On submit: prevents the page reload, validates everything, then calls `onSubmit(values)` **only if every field is valid**. |
| `errors` | The current error for each field: `errors.email?.message`. |
| `isSubmitting` | `true` while `onSubmit` is running (while waiting for the server, in patch 06). |
| `resolver: zodResolver(schema)` | Validate with our Zod schema instead of writing rules in each input. |

**When does it validate?** On the first submit. After that, each field is re-checked as
you type, so an error disappears as soon as you fix it. Nobody gets shouted at while
still typing their email for the first time.

It also puts the cursor in the **first invalid field** after a failed submit.

## 4. Validation happens twice, on purpose

| Where | Why |
|---|---|
| **Browser** (`login-schema.ts`) | Instant feedback, no request sent for obviously wrong input |
| **Server** (`auth.schemas.ts`) | Security: anyone can skip the browser and send anything (Postman proves it) |

The browser check is a convenience; the server check is the protection. They use the same
library (Zod) and the same messages, so the user sees the same thing either way.

`noValidate` on the `<form>` switches off the browser's own built-in validation pop-ups
(for `type="email"`), so all messages come from our schema and look the same.

## 5. Accessibility (a11y)

People use the app with a keyboard, a screen reader, or zoomed in. A few attributes make
the form work for everyone:

| Attribute | Effect |
|---|---|
| `<label htmlFor="email">` + `<input id="email">` | The label belongs to the input: a screen reader reads "Email, edit text", and clicking the label focuses the input. |
| `type="email"`, `type="password"` | Phones show the right keyboard; passwords are hidden. |
| `autoComplete="username"` / `"current-password"` | Password managers know what to fill in. |
| `aria-invalid="true"` | Screen readers announce "invalid". We also use it to colour the border red (`aria-invalid:border-danger`). |
| `aria-describedby="email-error"` | Screen readers read the error text after the label. |
| `role="alert"` on the error | The message is announced as soon as it appears. |
| a real `<button type="submit">` | Works with Enter and with the keyboard, for free. |

## 6. Reusable form pieces

Every screen of the app will have forms (create user, create project, create task…). So
we build small reusable components once:

```
components/ui/
├── Button.tsx      ← one look for every button, with variants (primary, secondary, danger)
├── Input.tsx       ← one look for every text input, red when invalid
└── FormField.tsx   ← label + input + error message, correctly linked
```

Then a form is mostly a list of `FormField`s, and every form in the app looks and behaves
the same.
