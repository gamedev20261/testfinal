import type { ReactNode } from 'react';

type FormFieldProps = {
  label: string;
  htmlFor: string; // the id of the input inside, so clicking the label focuses it
  error?: string;
  children: ReactNode;
};

// A label, the input you put inside it, and the error message under it (when there is one)
export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
