import { Outlet } from 'react-router';
import { TopNav } from './TopNav';
import { IconSidebar } from './IconSidebar';
import { ConfirmHost } from '../ui/ConfirmDialog';

// The frame around every page after login: top bar, icon bar on the left, the page on the right
export function AppShell() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface-alt">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <IconSidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <ConfirmHost />
    </div>
  );
}
