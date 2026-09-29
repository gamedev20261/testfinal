import { Check, CheckCheck, Trash2, X } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { Label } from '../../../types/label';
import type { LabelClass } from '../../../types/project';
import type { EditorMode } from '../editor-mode';
import { SHAPE_NAME } from '../editor-mode';

type Props = {
  labels: Label[];
  classes: LabelClass[];
  mode: EditorMode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChangeClass: (id: string, classId: string) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
};

const REVIEW_BADGE = {
  PENDING: { tone: 'gray', text: 'Not reviewed' },
  APPROVED: { tone: 'green', text: 'Approved' },
  REJECTED: { tone: 'red', text: 'Rejected' },
} as const;

// The shapes on the open image. Click one to select it and zoom to it.
export function ObjectsPanel({ labels, classes, mode, selectedId, onSelect, onChangeClass, onDelete, onApprove, onReject, onApproveAll }: Props) {
  const classOf = (id: string) => classes.find((c) => c.id === id);
  const pending = labels.filter((l) => l.reviewStatus === 'PENDING').length;

  return (
    <div>
      {mode.canReview && pending > 0 && (
        <div className="border-b border-border p-3">
          <Button size="sm" variant="success" className="w-full" onClick={onApproveAll}><CheckCheck size={14} /> Approve all {pending} not reviewed</Button>
        </div>
      )}
      {labels.length === 0 && <p className="p-6 text-center text-xs text-text-secondary">No shapes on this image yet.</p>}
      <ul>
        {labels.map((label, index) => {
          const labelClass = classOf(label.labelClassId);
          const review = REVIEW_BADGE[label.reviewStatus];
          return (
            <li
              key={label.id}
              onClick={() => onSelect(label.id)}
              className={cn('cursor-pointer border-b border-border px-3 py-2 hover:bg-surface-alt', selectedId === label.id && 'bg-primary-light')}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 text-[11px] font-semibold text-text-secondary">{index + 1}</span>
                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: labelClass?.color ?? '#718096' }} />
                {mode.canEdit ? (
                  <select
                    value={label.labelClassId}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onChangeClass(label.id, e.target.value)}
                    aria-label="Class of this shape"
                    className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent text-xs font-medium hover:border-border"
                  >
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{labelClass?.name ?? 'Deleted class'}</span>
                )}
                <span className="text-[10px] text-text-secondary">{SHAPE_NAME[label.shapeType]}</span>
                {mode.canEdit && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete(label.id); }} className="rounded p-1 text-text-secondary hover:text-danger" aria-label={`Delete shape ${index + 1}`}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5 pl-7">
                <Badge tone={review.tone} className="text-[10px]">{review.text}</Badge>
                {mode.canReview && (
                  <div className="ml-auto flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onApprove(label.id); }} className={cn('rounded p-1 hover:bg-emerald-50', label.reviewStatus === 'APPROVED' ? 'text-success' : 'text-text-secondary')} aria-label={`Approve shape ${index + 1}`} title="Approve (A)">
                      <Check size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onReject(label.id); }} className={cn('rounded p-1 hover:bg-red-50', label.reviewStatus === 'REJECTED' ? 'text-danger' : 'text-text-secondary')} aria-label={`Reject shape ${index + 1}`} title="Reject (R)">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              {label.reviewComment && <p className="mt-1 pl-7 text-[11px] text-danger">“{label.reviewComment}”</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
