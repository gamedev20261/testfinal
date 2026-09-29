import { CheckSquare, Home, Shield } from 'lucide-react';
import type { User } from '../../types/user';

// The main pages, shown as tabs in the top bar and icons on the left
export function navItems(user: User) {
  return [
    { label: 'Home Page', path: '/', icon: Home },
    { label: 'Labeling tasks', path: '/tasks', icon: CheckSquare },
    ...(user.role === 'ADMIN' ? [{ label: 'Admin Portal', path: '/admin', icon: Shield }] : []),
  ];
}

// "/tasks/123" belongs to the "/tasks" tab; "/" only to itself
export const isActivePath = (current: string, path: string) =>
  path === '/' ? current === '/' || current.startsWith('/projects') : current.startsWith(path);
