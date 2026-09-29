import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Joins Tailwind classes. Skips false/undefined ones, and when two classes clash
// (e.g. "bg-primary" and "bg-danger") the last one wins.
//   cn('px-4 bg-primary', isError && 'bg-danger')  →  'px-4 bg-danger' when isError
export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}
