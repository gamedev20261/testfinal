import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tab<Key extends string> = { key: Key; label: ReactNode; icon?: ReactNode };

// A row of tabs with a blue line under the active one
export function Tabs<Key extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: Tab<Key>[];
  active: Key;
  onChange: (key: Key) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('flex gap-6 overflow-x-auto border-b border-border', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            '-mb-px flex items-center gap-1.5 border-b-2 py-3 text-sm font-medium whitespace-nowrap transition-colors',
            active === tab.key
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary',
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
