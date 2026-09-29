import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi } from '../../../api/projects';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { confirm } from '../../../components/ui/ConfirmDialog';
import { LoadError, Spinner } from '../../../components/ui/States';
import { initial } from '../../../lib/format';
import type { Member } from '../../../types/project';
import { useUsers } from '../../admin/queries';
import { projectKey, useProjectMembers } from '../queries';

// Annotators and auditors who can see the project. Giving someone a task adds them too.
export function TeamTab({ projectId }: { projectId: string }) {
  const members = useProjectMembers(projectId);
  const { data: users = [] } = useUsers();
  const [userId, setUserId] = useState('');
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: projectKey(projectId) });

  const add = useMutation({ mutationFn: () => projectsApi.addMembers(projectId, [userId]), onSuccess: () => { refresh(); setUserId(''); } });
  const remove = useMutation({ mutationFn: (id: string) => projectsApi.removeMember(projectId, id), onSuccess: () => { refresh(); toast.success('Removed from the team'); } });

  async function removeMember(member: Member) {
    const ok = await confirm({ title: `Remove ${member.name}?`, message: 'They will no longer see this project.', confirmLabel: 'Remove', danger: true });
    if (ok) remove.mutate(member.id);
  }

  if (members.isPending) return <Spinner />;
  if (members.isError) return <LoadError error={members.error} onRetry={() => members.refetch()} />;
  const candidates = users.filter((u) => u.role !== 'ADMIN' && !members.data.some((m) => m.id === u.id));

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-4">
        <Users size={16} className="text-primary" />
        <span className="mr-auto text-sm font-semibold">Team ({members.data.length})</span>
        <Select aria-label="User to add" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-56 py-1.5 text-xs">
          <option value="">Choose a user…</option>
          {candidates.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role.toLowerCase()})</option>)}
        </Select>
        <Button size="sm" disabled={!userId || add.isPending} onClick={() => add.mutate()}><Plus size={14} /> Add</Button>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-white">
        {members.data.length === 0 && <p className="p-6 text-center text-xs text-text-secondary">Nobody yet. Creating a task adds its annotator and auditor.</p>}
        {members.data.map((member) => (
          <div key={member.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">{initial(member.name)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{member.name}</p>
              <p className="text-xs text-text-secondary">{member.email}</p>
            </div>
            <Badge tone={member.role === 'AUDITOR' ? 'green' : 'blue'}>{member.role === 'AUDITOR' ? 'Auditor' : 'Annotator'}</Badge>
            <Button size="icon" variant="ghost" onClick={() => removeMember(member)} aria-label={`Remove ${member.name}`} className="hover:text-danger"><Trash2 size={14} /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
