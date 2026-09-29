import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi } from '../../api/users';
import { apiErrorMessage } from '../../api/client';
import { Dialog, DialogFooter } from '../../components/ui/Dialog';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import type { DirectoryUser, UserGroup } from '../../types/user';
import { usersKey, userGroupsKey } from './queries';

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name'),
  email: z.string().trim().pipe(z.email('Enter a valid email')),
  password: z.string(), // checked below: required for a new user only
  role: z.enum(['ADMIN', 'ANNOTATOR', 'AUDITOR']),
  groupId: z.string(),
});
type Values = z.infer<typeof schema>;

// Create a user (user = undefined) or edit one
export function UserDialog({ user, groups, onClose }: { user?: DirectoryUser; groups: UserGroup[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      password: '',
      role: user?.role ?? 'ANNOTATOR',
      groupId: user?.groupId ?? '',
    },
  });
  const { errors } = formState;

  const save = useMutation({
    mutationFn: (values: Values) => {
      const input = { ...values, groupId: values.groupId || null, password: values.password || undefined };
      return user ? usersApi.update(user.id, input) : usersApi.create(input);
    },
    meta: { inlineError: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKey });
      queryClient.invalidateQueries({ queryKey: userGroupsKey });
      toast.success(user ? 'User saved' : 'User created');
      onClose();
    },
    onError: (error) => setError('root', { message: apiErrorMessage(error) }),
  });

  function onSubmit(values: Values) {
    if (!user && values.password.length < 8) return setError('password', { message: 'Use at least 8 characters' });
    if (user && values.password && values.password.length < 8) return setError('password', { message: 'Use at least 8 characters' });
    save.mutate(values);
  }

  return (
    <Dialog open onClose={onClose} title={user ? `Edit ${user.name}` : 'Register new user'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Full name *" htmlFor="user-name" error={errors.name?.message}>
          <Input id="user-name" placeholder="e.g. Ayesha Khan" {...register('name')} />
        </FormField>
        <FormField label="Email *" htmlFor="user-email" error={errors.email?.message}>
          <Input id="user-email" type="email" autoComplete="off" {...register('email')} />
        </FormField>
        <FormField label={user ? 'New password (leave empty to keep)' : 'Password *'} htmlFor="user-password" error={errors.password?.message}>
          <Input id="user-password" type="password" autoComplete="new-password" {...register('password')} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Role *" htmlFor="user-role">
            <Select id="user-role" {...register('role')}>
              <option value="ANNOTATOR">Annotator</option>
              <option value="AUDITOR">Auditor</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </FormField>
          <FormField label="Group" htmlFor="user-group">
            <Select id="user-group" {...register('groupId')}>
              <option value="">No group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </Select>
          </FormField>
        </div>
        {errors.root && <p role="alert" className="text-sm text-danger">{errors.root.message}</p>}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : user ? 'Save' : 'Create user'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
