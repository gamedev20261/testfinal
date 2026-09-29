import { useState } from 'react';
import { Shield, Tag, Users } from 'lucide-react';
import { Tabs } from '../../components/ui/Tabs';
import { useUsers, useLabelClasses } from './queries';
import { UsersTab } from './UsersTab';
import { LabelClassesTab } from './LabelClassesTab';

type Tab = 'users' | 'labels';

// Admin Portal: the user directory and the label class catalogue
export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');
  const { data: users } = useUsers();
  const { data: classes } = useLabelClasses();

  return (
    <div className="mx-auto max-w-6xl p-3 sm:p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Shield size={22} className="text-primary" /> Administrative Portal</h1>
        <p className="mt-1 text-xs text-text-secondary">Group-based user directory and central label class catalogue</p>
      </div>
      <Tabs
        className="mb-6"
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'users', label: `Users (${users?.length ?? 0})`, icon: <Users size={16} /> },
          { key: 'labels', label: `Label Classes (${classes?.length ?? 0})`, icon: <Tag size={16} /> },
        ]}
      />
      {tab === 'users' ? <UsersTab /> : <LabelClassesTab />}
    </div>
  );
}
