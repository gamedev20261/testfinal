import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderCog, Plus, Trash2, UserCog, Users } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '../../api/users';
import { Button } from '../../components/ui/Button';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { confirm } from '../../components/ui/ConfirmDialog';
import { EmptyState, LoadError, Spinner } from '../../components/ui/States';
import { useCurrentUser } from '../auth/use-auth';
import { groupBy } from '../../lib/group-by';
import { formatDate, initial } from '../../lib/format';
import type { DirectoryUser, Role } from '../../types/user';
import { useUsers, useUserGroups, usersKey, userGroupsKey } from './queries';
import { Accordion } from './Accordion';
import { UserDialog } from './UserDialog';
import { GroupsDialog } from './GroupsDialog';

const ROLE_BADGE: Record<Role, { label: string; tone: BadgeTone }> = {
  ADMIN: { label: 'Admin', tone: 'indigo' },
  ANNOTATOR: { label: 'Annotator', tone: 'blue' },
  AUDITOR: { label: 'Auditor', tone: 'green' },
};

export function UsersTab() {
  const { data: me } = useCurrentUser();
  const users = useUsers();
  const { data: groups = [] } = useUserGroups();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<DirectoryUser | 'new' | null>(null);
  const [managingGroups, setManagingGroups] = useState(false);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: usersKey });
    queryClient.invalidateQueries({ queryKey: userGroupsKey });
  };
  const remove = useMutation({ mutationFn: usersApi.remove, onSuccess: () => { refresh(); toast.success('User deleted'); } });

  async function deleteUser(user: DirectoryUser) {
    const ok = await confirm({ title: `Delete ${user.name}?`, message: 'They can no longer sign in. Their finished work stays.', confirmLabel: 'Delete', danger: true });
    if (ok) remove.mutate(user.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Users size={16} className="text-primary" /> User Groups</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Each user has one of 3 roles (Annotator, Auditor, Admin) and can belong to a group</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setManagingGroups(true)}><FolderCog size={14} /> Manage groups</Button>
          <Button size="sm" onClick={() => setEditing('new')}><Plus size={14} /> Register New User</Button>
        </div>
      </div>

      {users.isPending ? <Spinner /> : users.isError ? <LoadError error={users.error} onRetry={() => users.refetch()} /> : users.data.length === 0 ? (
        <EmptyState icon={<Users size={36} />} title="No users yet" />
      ) : (
        groupBy(users.data, (u) => u.groupName, 'No group').map(([groupName, members]) => (
          <Accordion key={groupName} title={groupName} subtitle={`${members.length} ${members.length === 1 ? 'user' : 'users'} in this group`} badge={`${members.length} Users`} icon={<Users size={14} />}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-text-secondary">
                    <th className="px-5 py-2.5 text-left font-medium">User Name</th>
                    <th className="px-5 py-2.5 text-left font-medium">Email</th>
                    <th className="px-5 py-2.5 text-left font-medium">Role</th>
                    <th className="px-5 py-2.5 text-left font-medium">Joined</th>
                    <th className="px-5 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((user) => (
                    <tr key={user.id} className="border-b border-border/60 last:border-0 hover:bg-surface-alt/40">
                      <td className="px-5 py-3 font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">{initial(user.name)}</div>
                          {user.name}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-text-secondary">{user.email}</td>
                      <td className="px-5 py-3"><Badge tone={ROLE_BADGE[user.role].tone}>{ROLE_BADGE[user.role].label}</Badge></td>
                      <td className="px-5 py-3 text-xs text-text-secondary">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(user)} aria-label={`Edit ${user.name}`}><UserCog size={14} /></Button>
                        {user.id !== me?.id && (
                          <Button size="icon" variant="ghost" onClick={() => deleteUser(user)} aria-label={`Delete ${user.name}`} className="hover:text-danger"><Trash2 size={14} /></Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>
        ))
      )}

      {editing && <UserDialog user={editing === 'new' ? undefined : editing} groups={groups} onClose={() => setEditing(null)} />}
      <GroupsDialog
        open={managingGroups}
        onClose={() => setManagingGroups(false)}
        title="User groups"
        groups={groups.map((g) => ({ id: g.id, name: g.name, count: g.userCount }))}
        onCreate={(name) => usersApi.createGroup(name).then(refresh)}
        onRename={(id, name) => usersApi.renameGroup(id, name).then(refresh)}
        onDelete={(id) => usersApi.removeGroup(id).then(refresh)}
      />
    </div>
  );
}
