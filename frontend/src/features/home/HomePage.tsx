import { useCurrentUser, useLogout } from '../auth/use-auth';
import { Button } from '../../components/ui/Button';

// Placeholder shown after logging in. The next screen replaces it with the real admin portal.
export function HomePage() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-white p-8 text-center shadow-lg">
        <h1 className="text-xl font-bold text-text-primary">Welcome, {user?.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Signed in as {user?.email} ({user?.role})
        </p>
        <p className="mt-4 text-xs text-text-secondary">
          The admin portal (menu, projects, users) is the next screen we build.
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => logout.mutate()} disabled={logout.isPending}>
          {logout.isPending ? 'Logging out…' : 'Log out'}
        </Button>
      </div>
    </main>
  );
}
