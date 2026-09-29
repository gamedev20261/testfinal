import { Navigate, Outlet, useLocation } from 'react-router';
import { useCurrentUser } from './use-auth';
import { FullPageLoader } from '../../components/FullPageLoader';
import { Button } from '../../components/ui/Button';

// Guards every page inside it: only a logged-in user gets through, everyone else goes to /login
export function RequireAuth() {
  const { data: user, isPending, isError, refetch } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return <FullPageLoader />;
  }

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm text-text-secondary">The server could not be reached.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!user) {
    // Remember where the user wanted to go, so the login page can send them back there
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />; // the page for the current URL
}
