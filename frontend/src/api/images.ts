import { api } from './client';
import type { ProjectImage } from '../types/image';

// /api/images: the files of one image (the browser loads them with <img src>)
export const imagesApi = {
  thumbnailUrl: (id: string) => `/api/images/${id}/thumbnail`,
  previewUrl: (id: string) => `/api/images/${id}/preview`,
  tilesUrl: (id: string) => `/api/images/${id}/tiles/`,

  async remove(id: string) {
    await api.delete(`/images/${id}`);
  },
  async retry(id: string) {
    const { data } = await api.post<{ image: ProjectImage }>(`/images/${id}/retry`);
    return data.image;
  },
};
