# `frontend/src/components/ui/FormField.tsx`

> Added in **patch 05** · [View the code](../../../../../../frontend/src/components/ui/FormField.tsx) · Background: [Forms → accessibility](../../../../../concepts/forms.md#5-accessibility-a11y)

## What it is for

Wraps one form input with its **label** above and its **error message** below, correctly
linked for screen readers. Every form field in the app uses it:

```tsx
<FormField label="Email" htmlFor="email" error={errors.email?.message}>
  <Input id="email" … />
</FormField>
```

## The code

```tsx
type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
};
```
- `htmlFor`: the `id` of the input inside. (`htmlFor` is JSX's name for HTML's `for`.)
- `error?`: optional; `undefined` when the field is fine.
- `children: ReactNode`: whatever is placed between `<FormField>` and `</FormField>`,
  here the `<Input>`. `ReactNode` means "anything React can display".

```tsx
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
      </label>
      {children}
```
The label, then the input. Because the label's `htmlFor` matches the input's `id`,
clicking the label puts the cursor in the input, and screen readers announce the label.

```tsx
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
```
- `{error && (…)}`: show the paragraph **only when there is an error**. If `error` is
  `undefined`, React shows nothing.
- `id="email-error"`: the input points at this id with `aria-describedby`, so a screen
  reader reads the error after the label.
- `role="alert"`: screen readers announce the message the moment it appears.
