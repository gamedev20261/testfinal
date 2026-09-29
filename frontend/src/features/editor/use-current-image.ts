import { useSearchParams } from 'react-router';
import type { TaskDetail } from '../../types/task';

// The open image is kept in the URL (?image=<id>), so a reload stays on it
export function useCurrentImage(detail: TaskDetail) {
  const [params] = useSearchParams();
  const id = params.get('image');
  return detail.images.find((image) => image.id === id) ?? detail.images[0];
}
