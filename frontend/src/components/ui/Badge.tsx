import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

const tones = {
  gray: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
};

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = 'gray', className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}
