import { Navigate, Outlet } from 'react-router';
import { useCurrentUser } from './use-auth';

// Pages inside it are for admins only; others go back to the start page
export function RequireAdmin() {
  const { data: user } = useCurrentUser();
  return user?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/" replace />;
}
