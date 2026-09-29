import { imagesApi } from '../../../api/images';
import { cn } from '../../../lib/cn';
import { Badge } from '../../../components/ui/Badge';
import type { TaskImage } from '../../../types/task';

const REVIEW = { PENDING: null, APPROVED: { tone: 'green', text: 'Approved' }, REJECTED: { tone: 'red', text: 'Rejected' } } as const;

// All images of the task with their counts and the auditor's verdict
export function ImagesPanel({ images, currentId, onOpen }: { images: TaskImage[]; currentId: string; onOpen: (index: number) => void }) {
  return (
    <ul>
      {images.map((image, index) => {
        const review = REVIEW[image.reviewStatus];
        return (
          <li key={image.id}>
            <button onClick={() => onOpen(index)} className={cn('flex w-full gap-2.5 border-b border-border p-2.5 text-left hover:bg-surface-alt', image.id === currentId && 'bg-primary-light')}>
              {image.status === 'READY' ? (
                <img src={imagesApi.thumbnailUrl(image.id)} alt="" className="h-12 w-12 flex-shrink-0 rounded bg-slate-100 object-cover" />
              ) : (
                <div className="h-12 w-12 flex-shrink-0 rounded bg-slate-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{index + 1}. {image.originalName}</p>
                <p className="text-[11px] text-text-secondary">
                  {image.labelCount} shapes{image.rejectedCount > 0 && <span className="text-danger"> · {image.rejectedCount} rejected</span>}
                </p>
                {review && <Badge tone={review.tone} className="mt-0.5 text-[10px]">{review.text}</Badge>}
                {image.reviewComment && <p className="mt-0.5 line-clamp-2 text-[11px] text-danger">“{image.reviewComment}”</p>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
