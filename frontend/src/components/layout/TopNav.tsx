import { Link, useLocation } from 'react-router';
import { cn } from '../../lib/cn';
import { useCurrentUser } from '../../features/auth/use-auth';
import { navItems, isActivePath } from './nav-items';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

export function TopNav() {
  const { data: user } = useCurrentUser();
  const { pathname } = useLocation();
  if (!user) return null;

  return (
    <nav className="relative z-40 flex h-12 flex-shrink-0 items-center gap-2 border-b border-border bg-white px-2 sm:px-4 md:gap-6">
      <div className="mr-auto flex items-center gap-2 md:mr-2">
        <span className="hidden text-xs text-text-secondary lg:block">Information Extraction System</span>
        <Link to="/" className="text-sm font-bold text-primary">
          GeoAnnotator
        </Link>
      </div>

      <div className="hidden flex-1 items-center gap-1 overflow-x-auto md:flex">
        {navItems(user).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-1.5 rounded-sm px-3 py-1 text-sm whitespace-nowrap transition-colors',
              isActivePath(pathname, item.path)
                ? 'border-b-2 border-primary font-medium text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {item.label}
            {item.path === '/admin' && (
              <span className="rounded bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">Admin</span>
            )}
          </Link>
        ))}
      </div>

      <NotificationBell />
      <UserMenu user={user} />
    </nav>
  );
}
