import { Link, useLocation } from 'react-router';
import { cn } from '../../lib/cn';
import { useCurrentUser } from '../../features/auth/use-auth';
import { navItems, isActivePath } from './nav-items';

// The thin bar of icons on the left (desktop only)
export function IconSidebar() {
  const { data: user } = useCurrentUser();
  const { pathname } = useLocation();
  if (!user) return null;

  return (
    <aside className="hidden w-12 flex-shrink-0 flex-col items-center gap-1.5 border-r border-border bg-primary-light py-3 md:flex">
      {navItems(user).map(({ label, path, icon: Icon }) => (
        <Link
          key={path}
          to={path}
          title={label}
          aria-label={label}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
            isActivePath(pathname, path) ? 'bg-primary text-white shadow-xs' : 'text-text-secondary hover:bg-white hover:text-primary',
          )}
        >
          <Icon size={16} />
        </Link>
      ))}
    </aside>
  );
}
