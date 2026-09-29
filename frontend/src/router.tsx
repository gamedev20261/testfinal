import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from './features/auth/LoginPage';
import { RequireAuth } from './features/auth/RequireAuth';
import { RequireAdmin } from './features/auth/RequireAdmin';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './features/home/HomePage';
import { MyTasksPage } from './features/tasks/MyTasksPage';
import { ProjectPage } from './features/projects/ProjectPage';
import { AdminPage } from './features/admin/AdminPage';

// Which page to show for which URL
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    // Every page in `children` needs a logged-in user, and is shown inside the app shell
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/tasks', element: <MyTasksPage /> },
          // The editor (with OpenLayers) is big, so it is downloaded only when opened
          { path: '/tasks/:taskId', lazy: () => import('./features/editor/EditorPage').then((m) => ({ Component: m.EditorPage })) },
          {
            element: <RequireAdmin />,
            children: [
              { path: '/projects/:projectId', element: <ProjectPage /> },
              { path: '/admin', element: <AdminPage /> },
            ],
          },
        ],
      },
    ],
  },
  // Any other URL: go to the start page
  { path: '*', element: <Navigate to="/" replace /> },
]);
