import { Loader2 } from 'lucide-react';

// A spinner in the middle of the screen, while the app finds out who is logged in
export function FullPageLoader() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center text-text-secondary">
      <Loader2 size={24} className="animate-spin" />
    </div>
  );
}
