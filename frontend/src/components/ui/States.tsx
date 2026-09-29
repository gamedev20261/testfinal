import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { apiErrorMessage } from '../../api/client';
import { Button } from './Button';

// Shown while a list or page loads
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex h-40 items-center justify-center text-text-secondary">
      <Loader2 size={24} className="animate-spin" />
    </div>
  );
}

// Shown when loading failed, with a retry button
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
      <AlertTriangle className="text-danger" size={28} />
      <p className="text-sm text-red-800">{apiErrorMessage(error, 'Could not load this')}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

// Shown when a list has nothing in it
export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-10 text-center">
      <div className="mx-auto mb-2 flex justify-center text-slate-300">{icon}</div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {children && <div className="mt-2 text-xs text-text-secondary">{children}</div>}
    </div>
  );
}
