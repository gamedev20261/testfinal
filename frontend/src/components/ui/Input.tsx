import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

// The app's text input. Turns red when it has aria-invalid="true".
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'w-full rounded border border-border bg-white px-3 py-2 text-sm',
        'placeholder:text-text-secondary/60',
        'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
        'aria-invalid:border-danger aria-invalid:focus:ring-danger/30',
        className,
      )}
      {...props}
    />
  );
}
