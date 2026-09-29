import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { confirm } from '../../components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { apiErrorMessage } from '../../api/client';

type Group = { id: string; name: string; count?: number };

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  groups: Group[];
  onCreate: (name: string) => Promise<unknown>;
  onRename: (id: string, name: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
};

// Add, rename and delete groups (used for user groups and label groups)
export function GroupsDialog({ open, onClose, title, groups, onCreate, onRename, onDelete }: Props) {
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  // Runs a save; a failure (e.g. a name already taken) shows a message
  async function run(save: () => Promise<unknown>) {
    try {
      await save();
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }

  async function add() {
    if (newName.trim() && (await run(() => onCreate(newName.trim())))) setNewName('');
  }

  async function saveRename() {
    if (editing?.name.trim() && (await run(() => onRename(editing.id, editing.name.trim())))) setEditing(null);
  }

  async function remove(group: Group) {
    const ok = await confirm({ title: `Delete "${group.name}"?`, message: 'Its members stay, without a group.', confirmLabel: 'Delete', danger: true });
    if (ok) await run(() => onDelete(group.id));
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
        className="mb-4 flex gap-2"
      >
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New group name" aria-label="New group name" />
        <Button type="submit" disabled={!newName.trim()}>
          <Plus size={14} /> Add
        </Button>
      </form>

      <ul className="divide-y divide-border rounded border border-border">
        {groups.length === 0 && <li className="p-4 text-center text-xs text-text-secondary">No groups yet</li>}
        {groups.map((group) => (
          <li key={group.id} className="flex items-center gap-2 px-3 py-2">
            {editing?.id === group.id ? (
              <>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label="Group name" autoFocus className="py-1" />
                <Button size="icon" variant="ghost" onClick={saveRename} aria-label="Save"><Check size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancel"><X size={14} /></Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{group.name}</span>
                {group.count !== undefined && <span className="text-xs text-text-secondary">{group.count}</span>}
                <Button size="icon" variant="ghost" onClick={() => setEditing({ id: group.id, name: group.name })} aria-label={`Rename ${group.name}`}><Pencil size={13} /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(group)} aria-label={`Delete ${group.name}`} className="hover:text-danger"><Trash2 size={13} /></Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
