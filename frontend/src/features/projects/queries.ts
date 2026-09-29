import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects';

// Cache keys: everything about one project starts with ['project', id],
// so invalidateQueries({ queryKey: projectKey(id) }) refreshes all of it.
export const projectsKey = ['projects'];
export const projectKey = (id: string) => ['project', id];

export const useProjects = () => useQuery({ queryKey: projectsKey, queryFn: projectsApi.list });

export const useProject = (id: string) => useQuery({ queryKey: projectKey(id), queryFn: () => projectsApi.get(id) });

// While images are being processed, ask again every 3 seconds
export const useProjectImages = (id: string) =>
  useQuery({
    queryKey: [...projectKey(id), 'images'],
    queryFn: () => projectsApi.images(id),
    refetchInterval: (query) =>
      query.state.data?.some((image) => image.status === 'UPLOADED' || image.status === 'PROCESSING') ? 3000 : false,
  });

export const useProjectTasks = (id: string) =>
  useQuery({ queryKey: [...projectKey(id), 'tasks'], queryFn: () => projectsApi.tasks(id) });

export const useProjectMembers = (id: string) =>
  useQuery({ queryKey: [...projectKey(id), 'members'], queryFn: () => projectsApi.members(id) });

export const useProjectStats = (id: string) =>
  useQuery({ queryKey: [...projectKey(id), 'stats'], queryFn: () => projectsApi.stats(id) });
