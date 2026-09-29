import { useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { useLogout } from '../../features/auth/use-auth';
import { initial } from '../../lib/format';
import type { User } from '../../types/user';
import { Popover } from './Popover';
import { ChangePasswordDialog } from '../ChangePasswordDialog';

const ROLE_LABEL = { ADMIN: 'Administrator', ANNOTATOR: 'Annotator', AUDITOR: 'Auditor' };

export function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const logout = useLogout();

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-surface-alt"
        aria-label="Account menu"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
          {initial(user.name)}
        </div>
        <div className="hidden text-left lg:block">
          <span className="block text-xs leading-tight font-semibold text-text-primary">{user.name}</span>
          <span className="text-[10px] text-text-secondary">{ROLE_LABEL[user.role]}</span>
        </div>
      </button>

      <Popover open={open} onClose={() => setOpen(false)} className="w-56 py-1">
        <div className="border-b border-border px-3 py-2">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-text-secondary">{user.email}</p>
          <span className="mt-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Role: {ROLE_LABEL[user.role]}
          </span>
        </div>
        <button
          onClick={() => {
            setChangingPassword(true);
            setOpen(false);
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-alt"
        >
          <KeyRound size={14} /> Change password
        </button>
        <button onClick={() => logout.mutate()} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-surface-alt">
          <LogOut size={14} /> Sign out
        </button>
      </Popover>

      <ChangePasswordDialog open={changingPassword} onClose={() => setChangingPassword(false)} />
    </div>
  );
}
