import { Check, Clock, Play, Send, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Badge, type BadgeTone } from '../ui/Badge';
import type { TaskStatus } from '../../types/task';

const STATUS: Record<TaskStatus, { label: string; tone: BadgeTone; icon: typeof Clock }> = {
  NOT_STARTED: { label: 'Not started', tone: 'gray', icon: Clock },
  IN_PROGRESS: { label: 'In progress', tone: 'sky', icon: Play },
  SUBMITTED: { label: 'Submitted', tone: 'indigo', icon: Send },
  PASSED: { label: 'Passed', tone: 'green', icon: Check },
  FAILED: { label: 'Failed', tone: 'red', icon: X },
};

export const taskStatusLabel = (status: TaskStatus) => STATUS[status].label;

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { label, tone, icon: Icon } = STATUS[status];
  return (
    <Badge tone={tone}>
      <Icon size={11} />
      {label}
    </Badge>
  );
}

const STEPS = ['Not started', 'In progress', 'Submitted', 'Reviewed'];
const STEP_OF: Record<TaskStatus, number> = { NOT_STARTED: 0, IN_PROGRESS: 1, SUBMITTED: 2, PASSED: 3, FAILED: 3 };

// Four dots joined by lines: how far the task has come
export function TaskProgressStepper({ status }: { status: TaskStatus }) {
  const current = STEP_OF[status];
  return (
    <div className="flex items-center gap-1" title={taskStatusLabel(status)}>
      {STEPS.map((step, index) => {
        const done = index < current || status === 'PASSED';
        const isCurrent = index === current;
        const failed = isCurrent && status === 'FAILED';
        return (
          <div key={step} className="flex items-center gap-1">
            {index > 0 && <div className={cn('h-0.5 w-3', status === 'PASSED' ? 'bg-success' : index <= current ? 'bg-primary' : 'bg-border')} />}
            <div
              className={cn(
                'h-2.5 w-2.5 rounded-full border',
                failed ? 'border-danger bg-danger' : done ? 'border-success bg-success' : isCurrent ? 'border-primary bg-primary' : 'border-border bg-white',
              )}
            />
          </div>
        );
      })}
      <span className="ml-2 text-[11px] font-medium text-text-secondary">{taskStatusLabel(status)}</span>
    </div>
  );
}
