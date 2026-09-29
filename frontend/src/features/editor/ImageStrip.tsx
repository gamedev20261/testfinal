import { imagesApi } from '../../api/images';
import { cn } from '../../lib/cn';
import type { TaskImage } from '../../types/task';

const BORDER = { PENDING: 'border-transparent', APPROVED: 'border-success', REJECTED: 'border-danger' };

// Thumbnails of the task's images along the bottom
export function ImageStrip({ images, currentId, onOpen }: { images: TaskImage[]; currentId: string; onOpen: (index: number) => void }) {
  if (images.length < 2) return null;
  return (
    <div className="flex h-20 flex-shrink-0 gap-2 overflow-x-auto border-t border-border bg-white px-3 py-2">
      {images.map((image, index) => (
        <button
          key={image.id}
          onClick={() => onOpen(index)}
          title={image.originalName}
          className={cn('relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2', BORDER[image.reviewStatus], image.id === currentId && 'ring-2 ring-primary ring-offset-1')}
        >
          {image.status === 'READY' && <img src={imagesApi.thumbnailUrl(image.id)} alt="" className="h-full w-full object-cover" />}
          <span className="absolute top-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px] font-bold text-white">{index + 1}</span>
          {image.labelCount > 0 && <span className="absolute right-0.5 bottom-0.5 rounded bg-primary px-1 text-[10px] font-bold text-white">{image.labelCount}</span>}
        </button>
      ))}
    </div>
  );
}
