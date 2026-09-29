import { useState } from 'react';
import { FolderOpen, Image as ImageIcon, Layers, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useCurrentUser } from '../auth/use-auth';
import { useProjects } from '../projects/queries';
import { CreateProjectDialog } from '../projects/CreateProjectDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState, LoadError, Spinner } from '../../components/ui/States';
import { cn } from '../../lib/cn';
import { ProjectCard } from './ProjectCard';
import { filterProjects, SORTS, type SortKey, type TypeFilter } from './project-filters';

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DETECTION', label: 'Object Detection' },
  { value: 'SEGMENTATION', label: 'Segmentation' },
];

export function HomePage() {
  const { data: user } = useCurrentUser();
  const projects = useProjects();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('ALL');
  const [sort, setSort] = useState<SortKey>('recent');
  const [creating, setCreating] = useState(false);
  if (!user) return null;

  const all = projects.data ?? [];
  const shown = filterProjects(all, search, type, sort);
  const stats = [
    { label: 'Total Projects', value: all.length, icon: FolderOpen, color: 'bg-sky-50 text-primary' },
    { label: 'Uploaded Images', value: all.reduce((sum, p) => sum + p.imageCount, 0), icon: ImageIcon, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Tasks', value: all.reduce((sum, p) => sum + p.taskCount, 0), icon: Layers, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-3 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Projects</h1>
        {user.role === 'ADMIN' && (
          <Button onClick={() => setCreating(true)} className="rounded-xl text-xs">
            <Plus size={15} /> New Project
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center justify-between rounded-xl border border-border bg-white p-4 shadow-xs">
            <div>
              <span className="block text-xs font-medium text-text-secondary">{label}</span>
              <span className="mt-0.5 block text-2xl font-bold">{value}</span>
            </div>
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color)}>
              <Icon size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-3 shadow-xs">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-40 flex-1 sm:max-w-sm">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <Input type="search" aria-label="Search projects" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 text-xs" />
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs">
            {TYPE_FILTERS.map((option) => (
              <button
                key={option.value}
                onClick={() => setType(option.value)}
                className={cn('rounded-md px-3 py-1 font-medium', type === option.value ? 'bg-white font-semibold text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SlidersHorizontal size={13} className="text-slate-400" />
          <Select aria-label="Sort projects" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-auto py-1.5 text-xs">
            {Object.entries(SORTS).map(([key, option]) => (
              <option key={key} value={key}>{option.label}</option>
            ))}
          </Select>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
            {shown.length} {shown.length === 1 ? 'Project' : 'Projects'}
          </span>
        </div>
      </div>

      {projects.isPending ? (
        <Spinner />
      ) : projects.isError ? (
        <LoadError error={projects.error} onRetry={() => projects.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState icon={<FolderOpen size={40} />} title={all.length ? 'No matching projects' : 'No projects yet'}>
          {user.role === 'ADMIN' && !all.length && 'Create the first project with the New Project button.'}
          {user.role !== 'ADMIN' && !all.length && 'When an admin gives you a task, its project appears here.'}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((project) => (
            <ProjectCard key={project.id} project={project} user={user} />
          ))}
        </div>
      )}

      {creating && <CreateProjectDialog open onClose={() => setCreating(false)} />}
    </div>
  );
}
