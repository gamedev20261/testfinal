import { AlertTriangle, Eye, Lock, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { Label } from '../../types/label';
import type { TaskDetail } from '../../types/task';
import type { EditorMode } from './editor-mode';

function Banner({ tone, icon, children }: { tone: 'red' | 'indigo' | 'green' | 'gray'; icon: ReactNode; children: ReactNode }) {
  const colors = {
    red: 'border-red-200 bg-red-50 text-red-800',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    gray: 'border-border bg-surface-alt text-text-secondary',
  };
  return <div className={cn('flex flex-shrink-0 items-start gap-2 border-b px-4 py-2 text-xs', colors[tone])}>{icon}<div>{children}</div></div>;
}

// A one-line explanation of what is going on in this task, for this user
export function Banners({ detail, mode, labels }: { detail: TaskDetail; mode: EditorMode; labels: Label[] }) {
  const { task } = detail;
  if (mode.canReview) {
    const count = (status: Label['reviewStatus']) => labels.filter((l) => l.reviewStatus === status).length;
    return (
      <Banner tone="green" icon={<ShieldCheck size={15} />}>
        <strong>Review mode.</strong> Approve (A) or reject (R) each shape, then approve or reject the image, or pass/fail the whole task.
        <span className="ml-2 font-semibold">This image: {count('PENDING')} not reviewed · {count('APPROVED')} approved · {count('REJECTED')} rejected</span>
      </Banner>
    );
  }
  if (mode.isAnnotator && task.status === 'FAILED') {
    return (
      <Banner tone="red" icon={<AlertTriangle size={15} />}>
        <strong>The auditor sent this task back.</strong> {task.rejectedCount} shape(s) rejected: fix or delete them, then submit again.
        {task.reviewComment && <p className="mt-0.5 whitespace-pre-line">“{task.reviewComment}”</p>}
      </Banner>
    );
  }
  if (task.status === 'SUBMITTED') {
    return <Banner tone="indigo" icon={<Lock size={15} />}>Submitted for review. Editing is locked until the auditor has decided.</Banner>;
  }
  if (task.status === 'PASSED') {
    return <Banner tone="green" icon={<ShieldCheck size={15} />}>This task passed review. It is read-only now.</Banner>;
  }
  if (mode.isAuditor && !mode.isAnnotator) {
    return <Banner tone="gray" icon={<Eye size={15} />}>The annotator has not submitted this task yet. You can follow the progress; reviewing starts after submission.</Banner>;
  }
  return null;
}
