import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from './features/auth/LoginPage';
import { RequireAuth } from './features/auth/RequireAuth';
import { HomePage } from './features/home/HomePage';

// Which page to show for which URL
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    // Every page in `children` needs a logged-in user
    element: <RequireAuth />,
    children: [{ path: '/', element: <HomePage /> }],
  },
  // Any other URL: go to the start page
  { path: '*', element: <Navigate to="/" replace /> },
]);
