import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { projectsApi } from '../../api/projects';
import { apiErrorMessage } from '../../api/client';
import { projectKey } from './queries';

// Only TIFF / GeoTIFF images can be uploaded
export const IMAGE_TYPES = '.tif,.tiff';
const isTiff = (file: File) => /\.tiff?$/i.test(file.name);

// Opens the file picker, uploads the chosen images and tracks the progress (0-100)
export function useImageUpload(projectId: string) {
  const input = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const queryClient = useQueryClient();

  async function upload(chosen: File[]) {
    const refused = chosen.filter((file) => !isTiff(file));
    if (refused.length > 0) toast.error(`Only TIFF images (.tif, .tiff) can be uploaded. Skipped: ${refused.map((f) => f.name).join(', ')}`);
    const files = chosen.filter(isTiff);
    if (files.length === 0) return;
    setProgress(0);
    try {
      await projectsApi.upload(projectId, files, setProgress);
      toast.success(`${files.length} image(s) uploaded. They are being processed now.`);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Upload failed'));
    } finally {
      setProgress(null);
      queryClient.invalidateQueries({ queryKey: projectKey(projectId) });
    }
  }

  // A hidden <input type="file"> the page renders once; pick() clicks it
  const inputProps = {
    ref: input,
    type: 'file' as const,
    multiple: true,
    accept: IMAGE_TYPES,
    className: 'hidden',
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      void upload([...(event.target.files ?? [])]);
      event.target.value = ''; // so the same file can be chosen again
    },
  };

  return { pick: () => input.current?.click(), upload, progress, isUploading: progress !== null, inputProps };
}
