import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderCog, Layers, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { labelClassesApi } from '../../api/label-classes';
import { Button } from '../../components/ui/Button';
import { confirm } from '../../components/ui/ConfirmDialog';
import { EmptyState, LoadError, Spinner } from '../../components/ui/States';
import { groupBy } from '../../lib/group-by';
import type { LabelClass } from '../../types/project';
import { useLabelClasses, useLabelGroups, labelClassesKey, labelGroupsKey } from './queries';
import { Accordion } from './Accordion';
import { LabelClassDialog } from './LabelClassDialog';
import { GroupsDialog } from './GroupsDialog';

export function LabelClassesTab() {
  const classes = useLabelClasses();
  const { data: groups = [] } = useLabelGroups();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<LabelClass | 'new' | null>(null);
  const [managingGroups, setManagingGroups] = useState(false);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: labelClassesKey });
    queryClient.invalidateQueries({ queryKey: labelGroupsKey });
  };
  const remove = useMutation({ mutationFn: labelClassesApi.remove, onSuccess: () => { refresh(); toast.success('Label class deleted'); } });

  async function deleteClass(labelClass: LabelClass) {
    const used = labelClass.labelCount ? `\n${labelClass.labelCount} shape(s) use it; they keep it.` : '';
    const ok = await confirm({ title: `Delete ${labelClass.name}?`, message: `It can no longer be chosen for new shapes.${used}`, confirmLabel: 'Delete', danger: true });
    if (ok) remove.mutate(labelClass.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Tag size={16} className="text-primary" /> Global Label Groups</h2>
          <p className="mt-0.5 text-xs text-text-secondary">The catalogue of classes. Each project picks the classes it uses.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setManagingGroups(true)}><FolderCog size={14} /> Manage groups</Button>
          <Button size="sm" onClick={() => setEditing('new')}><Plus size={14} /> Create Label Class</Button>
        </div>
      </div>

      {classes.isPending ? <Spinner /> : classes.isError ? <LoadError error={classes.error} onRetry={() => classes.refetch()} /> : classes.data.length === 0 ? (
        <EmptyState icon={<Tag size={36} />} title="No label classes yet" />
      ) : (
        groupBy(classes.data, (c) => c.groupName, 'No group').map(([groupName, items]) => (
          <Accordion key={groupName} title={groupName} subtitle={`${items.length} ${items.length === 1 ? 'class' : 'classes'} in this group`} badge={`${items.length} Classes`} icon={<Layers size={14} />}>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {items.map((labelClass) => (
                <div key={labelClass.id} className="rounded-lg border border-border bg-surface-alt/20 p-3 transition-all hover:border-primary/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: labelClass.color }} />
                      <span className="truncate text-xs font-semibold" title={labelClass.name}>{labelClass.name}</span>
                    </div>
                    <div className="flex">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(labelClass)} aria-label={`Edit ${labelClass.name}`}><Pencil size={12} /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-danger" onClick={() => deleteClass(labelClass)} aria-label={`Delete ${labelClass.name}`}><Trash2 size={12} /></Button>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-text-secondary">
                    <span>{labelClass.labelCount ?? 0} shapes</span>
                    <span className="font-mono">{labelClass.color}</span>
                  </div>
                </div>
              ))}
            </div>
          </Accordion>
        ))
      )}

      {editing && <LabelClassDialog labelClass={editing === 'new' ? undefined : editing} groups={groups} onClose={() => setEditing(null)} />}
      <GroupsDialog
        open={managingGroups}
        onClose={() => setManagingGroups(false)}
        title="Label groups"
        groups={groups}
        onCreate={(name) => labelClassesApi.createGroup(name).then(refresh)}
        onRename={(id, name) => labelClassesApi.renameGroup(id, name).then(refresh)}
        onDelete={(id) => labelClassesApi.removeGroup(id).then(refresh)}
      />
    </div>
  );
}
