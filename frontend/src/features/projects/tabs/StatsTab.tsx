import { LoadError, Spinner } from '../../../components/ui/States';
import { taskStatusLabel } from '../../../components/task/TaskStatus';
import type { TaskStatus } from '../../../types/task';
import { useProjectStats } from '../queries';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

// A row with a label, a bar and a number
function Bar({ label, value, max, color = '#1b6ef3' }: { label: string; value: number; max: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 truncate text-text-secondary">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-surface-alt">
        <div className="h-2 rounded-full" style={{ width: `${max ? (value / max) * 100 : 0}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-right font-semibold">{value}</span>
    </div>
  );
}

const TASK_STATUSES: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'PASSED', 'FAILED'];
const REVIEW = [
  { key: 'PENDING', label: 'Not reviewed', color: '#a0aec0' },
  { key: 'APPROVED', label: 'Approved', color: '#38a169' },
  { key: 'REJECTED', label: 'Rejected', color: '#e53e3e' },
];

export function StatsTab({ projectId }: { projectId: string }) {
  const stats = useProjectStats(projectId);
  if (stats.isPending) return <Spinner />;
  if (stats.isError) return <LoadError error={stats.error} onRetry={() => stats.refetch()} />;
  const { tasksByStatus, labelsByReview, labelsByClass, byAnnotator } = stats.data;
  const taskMax = Math.max(0, ...Object.values(tasksByStatus));
  const reviewMax = Math.max(0, ...Object.values(labelsByReview));
  const classMax = Math.max(0, ...labelsByClass.map((c) => c.count));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Tasks by status">
        <div className="space-y-2">
          {TASK_STATUSES.map((status) => <Bar key={status} label={taskStatusLabel(status)} value={tasksByStatus[status] ?? 0} max={taskMax} />)}
        </div>
      </Card>
      <Card title="Shapes by review">
        <div className="space-y-2">
          {REVIEW.map((r) => <Bar key={r.key} label={r.label} value={labelsByReview[r.key] ?? 0} max={reviewMax} color={r.color} />)}
        </div>
      </Card>
      <Card title="Shapes per class">
        {labelsByClass.length === 0 ? <p className="text-xs text-text-secondary">No shapes yet</p> : (
          <div className="space-y-2">
            {labelsByClass.map((c) => <Bar key={c.id} label={c.name} value={c.count} max={classMax} color={c.color} />)}
          </div>
        )}
      </Card>
      <Card title="Work per annotator">
        {byAnnotator.length === 0 ? <p className="text-xs text-text-secondary">No shapes yet</p> : (
          <table className="w-full text-xs">
            <thead className="text-text-secondary">
              <tr><th className="py-1 text-left font-medium">Annotator</th><th className="text-right font-medium">Shapes</th><th className="text-right font-medium">Approved</th><th className="text-right font-medium">Rejected</th></tr>
            </thead>
            <tbody>
              {byAnnotator.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="py-1.5">{a.name}</td>
                  <td className="text-right font-semibold">{a.labels}</td>
                  <td className="text-right text-success">{a.approved}</td>
                  <td className="text-right text-danger">{a.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
