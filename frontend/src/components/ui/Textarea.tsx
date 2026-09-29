import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      rows={3}
      className={cn(
        'w-full rounded border border-border bg-white px-3 py-2 text-sm',
        'placeholder:text-text-secondary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  );
}
