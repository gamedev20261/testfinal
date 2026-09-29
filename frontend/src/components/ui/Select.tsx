import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

// A native <select> with the app's look
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'w-full rounded border border-border bg-white px-3 py-2 text-sm',
        'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  );
}
