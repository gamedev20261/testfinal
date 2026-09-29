import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-white text-text-primary border border-border hover:bg-surface-alt',
  danger: 'bg-danger text-white hover:bg-red-600',
  success: 'bg-success text-white hover:bg-green-700',
  ghost: 'text-text-secondary hover:bg-surface-alt hover:text-text-primary',
};

const sizes = {
  md: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
  icon: 'h-8 w-8 p-0',
};

type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

// The app's button. It accepts every normal <button> prop too (type, onClick, disabled…)
export function Button({ variant = 'primary', size = 'md', type = 'button', className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
