import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Box, Download, Image as ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi } from '../../../api/tasks';
import { Button } from '../../../components/ui/Button';
import { confirm } from '../../../components/ui/ConfirmDialog';
import { EmptyState, LoadError, Spinner } from '../../../components/ui/States';
import { TaskProgressStepper } from '../../../components/task/TaskStatus';
import { initial } from '../../../lib/format';
import type { Task } from '../../../types/task';
import { projectKey, projectsKey, useProjectTasks } from '../queries';
import { TaskDialog } from './TaskDialog';

function Person({ name, tone }: { name: string; tone: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${tone}`}>{initial(name)}</div>
      <span className="max-w-32 truncate font-medium">{name}</span>
    </div>
  );
}

export function TasksTab({ projectId, onExport }: { projectId: string; onExport: () => void }) {
  const tasks = useProjectTasks(projectId);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Task | 'new' | null>(null);

  const remove = useMutation({
    mutationFn: tasksApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKey(projectId) });
      queryClient.invalidateQueries({ queryKey: projectsKey });
      toast.success('Task deleted');
    },
  });

  async function deleteTask(task: Task) {
    const ok = await confirm({ title: `Delete ${task.name}?`, message: `Its ${task.labelCount} shape(s) are deleted too.`, confirmLabel: 'Delete', danger: true });
    if (ok) remove.mutate(task.id);
  }

  if (tasks.isPending) return <Spinner />;
  if (tasks.isError) return <LoadError error={tasks.error} onRetry={() => tasks.refetch()} />;
  const passed = tasks.data.filter((t) => t.status === 'PASSED').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold">Project Tasks <span className="text-xs font-normal text-text-secondary">({tasks.data.length} total)</span></h2>
          <p className="mt-0.5 text-xs text-text-secondary">Assign imagery, exactly 1 annotator, and 1 auditor per task.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onExport} disabled={passed === 0} title={passed === 0 ? 'A task can be exported once it has passed review' : undefined}>
            <Download size={14} /> Export Dataset ({passed} Passed)
          </Button>
          <Button size="sm" onClick={() => setEditing('new')}><Plus size={14} /> New Task</Button>
        </div>
      </div>

      {tasks.data.length === 0 ? (
        <EmptyState icon={<Box size={40} />} title="No tasks created yet">
          Create labeling tasks to split the project imagery between your annotators and auditors.
          <div className="mt-4"><Button size="sm" onClick={() => setEditing('new')}><Plus size={14} /> Create First Task</Button></div>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-border bg-surface-alt/70 text-[10px] font-medium tracking-wider text-text-secondary uppercase">
              <tr>
                <th className="px-4 py-3">Task Name</th>
                <th className="px-4 py-3">Annotator</th>
                <th className="px-4 py-3">Auditor</th>
                <th className="px-4 py-3">Imagery</th>
                <th className="px-4 py-3">Shapes</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.data.map((task) => (
                <tr key={task.id} className="hover:bg-surface-alt/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{task.name}</div>
                    {task.description && <div className="max-w-xs truncate text-[11px] text-text-secondary">{task.description}</div>}
                  </td>
                  <td className="px-4 py-3"><Person name={task.annotator.name} tone="bg-primary/10 text-primary" /></td>
                  <td className="px-4 py-3"><Person name={task.auditor.name} tone="bg-emerald-100 text-emerald-700" /></td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1"><ImageIcon size={13} className="text-primary" /><strong>{task.imageIds.length}</strong> images</span>
                  </td>
                  <td className="px-4 py-3">
                    {task.labelCount}
                    {task.rejectedCount > 0 && <span className="ml-1 text-danger">({task.rejectedCount} rejected)</span>}
                  </td>
                  <td className="px-4 py-3"><TaskProgressStepper status={task.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditing(task)}><Pencil size={11} /> Edit</Button>
                      <Link to={`/tasks/${task.id}`} className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1.5 text-xs font-medium hover:border-primary hover:text-primary">
                        Open <ArrowRight size={11} />
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => deleteTask(task)} aria-label={`Delete task ${task.name}`} className="hover:text-danger"><Trash2 size={13} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <TaskDialog projectId={projectId} task={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
