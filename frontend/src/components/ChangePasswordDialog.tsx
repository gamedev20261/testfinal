import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { authApi } from '../api/auth';
import { apiErrorMessage } from '../api/client';
import { Dialog, DialogFooter } from './ui/Dialog';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'Use at least 8 characters'),
    repeat: z.string(),
  })
  .refine((values) => values.newPassword === values.repeat, { message: 'The passwords do not match', path: ['repeat'] });

type Values = z.infer<typeof schema>;

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, reset, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', repeat: '' },
  });
  const { errors, isSubmitting } = formState;

  function close() {
    reset();
    onClose();
  }

  async function onSubmit(values: Values) {
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      toast.success('Password changed. Your other logins were signed out.');
      close();
    } catch (error) {
      setError('root', { message: apiErrorMessage(error) });
    }
  }

  return (
    <Dialog open={open} onClose={close} title="Change password">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Current password" htmlFor="current-password" error={errors.currentPassword?.message}>
          <Input id="current-password" type="password" autoComplete="current-password" {...register('currentPassword')} />
        </FormField>
        <FormField label="New password" htmlFor="new-password" error={errors.newPassword?.message}>
          <Input id="new-password" type="password" autoComplete="new-password" {...register('newPassword')} />
        </FormField>
        <FormField label="Repeat the new password" htmlFor="repeat-password" error={errors.repeat?.message}>
          <Input id="repeat-password" type="password" autoComplete="new-password" {...register('repeat')} />
        </FormField>
        {errors.root && <p role="alert" className="text-sm text-danger">{errors.root.message}</p>}
        <DialogFooter>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Change password'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
