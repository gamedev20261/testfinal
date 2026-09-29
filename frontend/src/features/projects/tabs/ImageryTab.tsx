import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Image as ImageIcon, Loader2, RotateCcw, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { imagesApi } from '../../../api/images';
import { Button } from '../../../components/ui/Button';
import { Badge, type BadgeTone } from '../../../components/ui/Badge';
import { confirm } from '../../../components/ui/ConfirmDialog';
import { EmptyState, LoadError, Spinner } from '../../../components/ui/States';
import { formatBytes } from '../../../lib/format';
import type { ImageStatus, ProjectImage } from '../../../types/image';
import { projectKey, projectsKey, useProjectImages } from '../queries';

const STATUS: Record<ImageStatus, { label: string; tone: BadgeTone }> = {
  UPLOADED: { label: 'Waiting', tone: 'gray' },
  PROCESSING: { label: 'Processing', tone: 'sky' },
  READY: { label: 'Ready', tone: 'green' },
  FAILED: { label: 'Failed', tone: 'red' },
};

export function ImageryTab({ projectId, onUpload, isUploading }: { projectId: string; onUpload: () => void; isUploading: boolean }) {
  const images = useProjectImages(projectId);
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: projectKey(projectId) });
    queryClient.invalidateQueries({ queryKey: projectsKey });
  };

  const remove = useMutation({ mutationFn: imagesApi.remove, onSuccess: () => { refresh(); toast.success('Image deleted'); } });
  const retry = useMutation({ mutationFn: imagesApi.retry, onSuccess: refresh });

  async function deleteImage(image: ProjectImage) {
    const ok = await confirm({ title: `Delete ${image.originalName}?`, message: 'The file and its tiles are removed from the server.', confirmLabel: 'Delete', danger: true });
    if (ok) remove.mutate(image.id);
  }

  if (images.isPending) return <Spinner />;
  if (images.isError) return <LoadError error={images.error} onRetry={() => images.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold"><ImageIcon size={16} className="text-primary" /> Project imagery</h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            TIFF or GeoTIFF only (.tif, .tiff). 16-bit and multi-band images are converted for display; GeoTIFFs keep their map position.
          </p>
        </div>
        <Button size="sm" onClick={onUpload} disabled={isUploading}>
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload images
        </Button>
      </div>

      {images.data.length === 0 ? (
        <EmptyState icon={<ImageIcon size={40} />} title="No images yet">Upload the images the annotators will label.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.data.map((image) => (
            <div key={image.id} className="flex gap-3 rounded-xl border border-border bg-white p-3">
              {image.status === 'READY' ? (
                <img src={imagesApi.thumbnailUrl(image.id)} alt="" loading="lazy" className="h-20 w-20 flex-shrink-0 rounded-lg bg-slate-100 object-cover" />
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                  {image.status === 'FAILED' ? <ImageIcon size={22} /> : <Loader2 size={22} className="animate-spin" />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" title={image.originalName}>{image.originalName}</p>
                <p className="text-[11px] text-text-secondary">
                  {formatBytes(image.sizeBytes)}
                  {image.width && ` · ${image.width} × ${image.height} px`}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge tone={STATUS[image.status].tone}>{STATUS[image.status].label}</Badge>
                  {image.isGeoreferenced && <Badge tone="indigo"><Globe size={10} /> {image.srid ? `EPSG:${image.srid}` : 'Georeferenced'}</Badge>}
                </div>
                {image.errorMessage && <p className="mt-1 line-clamp-2 text-[11px] text-danger" title={image.errorMessage}>{image.errorMessage}</p>}
                {image.taskNames.length > 0 && <p className="mt-1 truncate text-[11px] text-text-secondary">Tasks: {image.taskNames.join(', ')}</p>}
              </div>
              <div className="flex flex-col gap-1">
                {image.status === 'FAILED' && (
                  <Button size="icon" variant="ghost" onClick={() => retry.mutate(image.id)} aria-label={`Process ${image.originalName} again`}><RotateCcw size={14} /></Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => deleteImage(image)} aria-label={`Delete ${image.originalName}`} className="hover:text-danger"><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
