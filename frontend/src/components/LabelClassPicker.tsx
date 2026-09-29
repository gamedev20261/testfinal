import { groupBy } from '../lib/group-by';
import type { LabelClass } from '../types/project';

type Props = {
  classes: LabelClass[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

// Checkboxes for label classes, grouped like in the admin portal
export function LabelClassPicker({ classes, selected, onChange }: Props) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  if (classes.length === 0) {
    return <p className="text-xs text-text-secondary">No label classes yet. An admin creates them in the Admin Portal.</p>;
  }
  return (
    <div className="max-h-64 space-y-3 overflow-y-auto rounded border border-border p-3">
      {groupBy(classes, (c) => c.groupName, 'No group').map(([groupName, items]) => (
        <div key={groupName}>
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">{groupName}</p>
          <div className="grid grid-cols-2 gap-1">
            {items.map((labelClass) => (
              <label key={labelClass.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-alt">
                <input type="checkbox" checked={selected.includes(labelClass.id)} onChange={() => toggle(labelClass.id)} />
                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: labelClass.color }} />
                <span className="truncate">{labelClass.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
