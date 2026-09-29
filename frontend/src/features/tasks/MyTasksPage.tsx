import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle, CheckSquare, Image as ImageIcon } from 'lucide-react';
import { tasksApi } from '../../api/tasks';
import { EmptyState, LoadError, Spinner } from '../../components/ui/States';
import { TaskProgressStepper } from '../../components/task/TaskStatus';
import { ProjectTypeBadge } from '../../components/ProjectTypeBadge';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/cn';
import { timeAgo } from '../../lib/format';
import type { MyTask } from '../../types/task';

export const myTasksKey = ['tasks', 'mine'];

// Is it this user's turn? Annotators work on open tasks, auditors on submitted ones.
function needsMe(task: MyTask) {
  if (task.myRole === 'AUDITOR') return task.status === 'SUBMITTED';
  if (task.myRole === 'ANNOTATOR') return ['NOT_STARTED', 'IN_PROGRESS', 'FAILED'].includes(task.status);
  return task.status !== 'PASSED';
}

function actionLabel(task: MyTask) {
  if (task.myRole === 'AUDITOR') return task.status === 'SUBMITTED' ? 'Review' : 'View';
  if (task.myRole === 'ANNOTATOR') return task.status === 'FAILED' ? 'Fix' : task.status === 'NOT_STARTED' ? 'Start' : 'Open';
  return 'Open';
}

export function MyTasksPage() {
  const tasks = useQuery({ queryKey: myTasksKey, queryFn: tasksApi.mine, refetchInterval: 60_000 });
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');

  if (tasks.isPending) return <Spinner />;
  if (tasks.isError) return <div className="p-6"><LoadError error={tasks.error} onRetry={() => tasks.refetch()} /></div>;
  const shown = filter === 'mine' ? tasks.data.filter(needsMe) : tasks.data;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold"><CheckSquare size={22} className="text-primary" /> My Labeling Tasks</h1>
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs">
          {([['mine', `Needs my action (${tasks.data.filter(needsMe).length})`], ['all', `All (${tasks.data.length})`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={cn('rounded-md px-3 py-1 font-medium', filter === key ? 'bg-white text-primary shadow-xs' : 'text-slate-600')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<CheckCircle size={44} />} title={tasks.data.length ? 'Nothing waiting for you' : 'No tasks assigned yet'}>
          {tasks.data.length ? 'Switch to "All" to see finished tasks.' : 'When an administrator assigns you a task, it appears here.'}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-xs text-text-secondary">
                <th className="px-4 py-3 text-left font-medium">Task & Project</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">My part</th>
                <th className="px-4 py-3 text-left font-medium">Imagery</th>
                <th className="px-4 py-3 text-left font-medium">Progress</th>
                <th className="px-4 py-3 text-left font-medium">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {shown.map((task) => (
                <tr key={task.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className="block font-semibold">{task.name}</span>
                    <span className="block text-xs font-medium text-primary">Project: {task.project.name}</span>
                    {task.status === 'FAILED' && task.reviewComment && (
                      <span className="line-clamp-1 text-xs text-danger" title={task.reviewComment}>Auditor: {task.reviewComment}</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><ProjectTypeBadge type={task.project.type} /></td>
                  <td className="px-4 py-3">
                    <Badge tone={task.myRole === 'AUDITOR' ? 'green' : task.myRole === 'ANNOTATOR' ? 'blue' : 'indigo'}>
                      {task.myRole === 'AUDITOR' ? 'Review' : task.myRole === 'ANNOTATOR' ? 'Annotate' : 'Admin'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="flex items-center gap-1.5"><ImageIcon size={14} className="text-primary" /><strong>{task.imageIds.length}</strong> image(s) · {task.labelCount} shapes</span>
                  </td>
                  <td className="px-4 py-3"><TaskProgressStepper status={task.status} /></td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{timeAgo(task.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/tasks/${task.id}`} className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white hover:bg-primary-dark">
                      {actionLabel(task)} <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
