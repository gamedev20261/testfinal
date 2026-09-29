import { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { Input } from '../../../components/ui/Input';
import type { Label } from '../../../types/label';
import type { LabelClass } from '../../../types/project';

type Props = {
  classes: LabelClass[];
  labels: Label[];
  activeClassId: string | null;
  onPick: (classId: string) => void;
  instructions: string;
};

// The project's classes: click (or press 1-9) to draw with one, or to change the selected shape
export function ClassesPanel({ classes, labels, activeClassId, onPick, instructions }: Props) {
  const [search, setSearch] = useState('');
  const shown = classes.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));
  const countOf = (id: string) => labels.filter((l) => l.labelClassId === id).length;

  return (
    <div className="space-y-3 p-3">
      {instructions && (
        <div className="rounded-lg border border-primary/20 bg-primary-light p-2.5 text-xs">
          <p className="mb-0.5 font-semibold text-primary">Instructions</p>
          <p className="whitespace-pre-line text-text-primary">{instructions}</p>
        </div>
      )}
      <div className="relative">
        <Search size={13} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search classes…" aria-label="Search classes" className="py-1.5 pl-7 text-xs" />
      </div>
      {classes.length === 0 && <p className="text-xs text-text-secondary">This project has no label classes. Ask an admin to add some.</p>}
      <ul className="space-y-1">
        {shown.map((labelClass) => {
          const key = classes.indexOf(labelClass) + 1;
          return (
            <li key={labelClass.id}>
              <button
                onClick={() => onPick(labelClass.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors',
                  activeClassId === labelClass.id ? 'border-primary bg-primary-light' : 'border-transparent hover:bg-surface-alt',
                )}
              >
                <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: labelClass.color }} />
                <span className="flex-1 truncate">{labelClass.name}</span>
                <span className="text-[11px] text-text-secondary">{countOf(labelClass.id)}</span>
                {key <= 9 && <kbd className="rounded border border-border bg-white px-1 font-mono text-[10px] text-text-secondary">{key}</kbd>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
