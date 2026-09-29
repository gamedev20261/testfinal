import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Box, Download, Image as ImageIcon, Layers, Pencil, Tag, Upload, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { LoadError, Spinner } from '../../components/ui/States';
import { ProjectTypeBadge } from '../../components/ProjectTypeBadge';
import { Badge } from '../../components/ui/Badge';
import { useProject } from './queries';
import { useImageUpload } from './use-image-upload';
import { SetupChecklist } from './SetupChecklist';
import { EditProjectDialog } from './EditProjectDialog';
import { ExportDialog } from './ExportDialog';
import { TasksTab } from './tabs/TasksTab';
import { TaskDialog } from './tabs/TaskDialog';
import { ProjectClassesTab } from './tabs/ProjectClassesTab';
import { ImageryTab } from './tabs/ImageryTab';
import { TeamTab } from './tabs/TeamTab';
import { StatsTab } from './tabs/StatsTab';

type Tab = 'tasks' | 'classes' | 'imagery' | 'team' | 'stats';

// Admin: set up and follow one project
export function ProjectPage() {
  const { projectId = '' } = useParams();
  const project = useProject(projectId);
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'tasks';
  const setTab = (next: Tab) => setParams({ tab: next }, { replace: true });
  const [dialog, setDialog] = useState<'edit' | 'export' | 'task' | null>(null);
  const upload = useImageUpload(projectId);

  if (project.isPending) return <Spinner />;
  if (project.isError) return <div className="p-6"><LoadError error={project.error} onRetry={() => project.refetch()} /></div>;
  const p = project.data;

  return (
    <div className="flex h-full flex-col">
      <input {...upload.inputProps} />

      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-border bg-white px-6 py-3 shadow-xs">
        <span className="rounded bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">Task Management & Setup</span>
        <h2 className="text-base font-bold">{p.name}</h2>
        <Button size="icon" variant="ghost" onClick={() => setDialog('edit')} aria-label="Edit project details"><Pencil size={14} /></Button>
        <ProjectTypeBadge type={p.type} />
        {p.status === 'ARCHIVED' && <Badge>Archived</Badge>}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={upload.pick} disabled={upload.isUploading}><Upload size={13} /> Upload images</Button>
          <Button variant="secondary" size="sm" onClick={() => setDialog('export')}><Download size={13} /> Export</Button>
        </div>
      </div>

      {upload.isUploading && (
        <div className="flex-shrink-0 border-b border-border bg-white px-6 py-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-text-secondary">Uploading… {upload.progress}%</span>
            <div className="h-1.5 flex-1 rounded-full bg-surface-alt"><div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${upload.progress}%` }} /></div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 border-b border-border bg-white px-6 py-3">
        <SetupChecklist
          classCount={p.labelClasses.length}
          imageCount={p.imageCount}
          taskCount={p.taskCount}
          onPickClasses={() => setTab('classes')}
          onUpload={upload.pick}
          onNewTask={() => setDialog('task')}
        />
      </div>

      <Tabs
        className="flex-shrink-0 bg-white px-6"
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'tasks', label: `Tasks (${p.taskCount})`, icon: <Box size={14} /> },
          { key: 'classes', label: `Label Classes (${p.labelClasses.length})`, icon: <Tag size={14} /> },
          { key: 'imagery', label: `Imagery (${p.imageCount})`, icon: <ImageIcon size={14} /> },
          { key: 'team', label: 'Team', icon: <Users size={14} /> },
          { key: 'stats', label: 'Statistics', icon: <Layers size={14} /> },
        ]}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl">
          {tab === 'tasks' && <TasksTab projectId={p.id} onExport={() => setDialog('export')} />}
          {tab === 'classes' && <ProjectClassesTab key={p.labelClasses.map((c) => c.id).join()} project={p} />}
          {tab === 'imagery' && <ImageryTab projectId={p.id} onUpload={upload.pick} isUploading={upload.isUploading} />}
          {tab === 'team' && <TeamTab projectId={p.id} />}
          {tab === 'stats' && <StatsTab projectId={p.id} />}
        </div>
      </div>

      {dialog === 'edit' && <EditProjectDialog project={p} onClose={() => setDialog(null)} />}
      {dialog === 'export' && <ExportDialog project={p} onClose={() => setDialog(null)} />}
      {dialog === 'task' && <TaskDialog projectId={p.id} onClose={() => setDialog(null)} />}
    </div>
  );
}
