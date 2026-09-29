import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

// A small panel under a button. Clicking anywhere else closes it.
export function Popover({ open, onClose, className, children }: { open: boolean; onClose: () => void; className?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className={cn('absolute top-full right-0 z-50 mt-1 rounded-lg border border-border bg-white shadow-lg', className)}>
        {children}
      </div>
    </>
  );
}
