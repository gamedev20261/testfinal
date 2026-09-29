import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// A card whose body opens and closes when you click its header
export function Accordion({ title, subtitle, badge, icon, children, defaultOpen = true }: {
  title: string;
  subtitle: string;
  badge: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between bg-surface-alt/70 px-5 py-3.5 text-left transition-colors hover:bg-surface-alt"
      >
        <div className="flex items-center gap-3">
          <span className="text-primary">{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">{icon}</div>
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            <span className="text-[11px] text-text-secondary">{subtitle}</span>
          </div>
        </div>
        <span className="rounded-full border border-border bg-white px-2.5 py-0.5 text-xs font-semibold text-text-secondary">{badge}</span>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}
