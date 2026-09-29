import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks';

export const taskKey = (taskId: string) => ['task', taskId];
export const labelsKey = (taskId: string, imageId: string) => ['task', taskId, 'labels', imageId];

export const useTaskDetail = (taskId: string) => useQuery({ queryKey: taskKey(taskId), queryFn: () => tasksApi.get(taskId) });

export const useImageLabels = (taskId: string, imageId: string | undefined) =>
  useQuery({
    queryKey: labelsKey(taskId, imageId ?? ''),
    queryFn: () => tasksApi.labels(taskId, imageId!),
    enabled: !!imageId,
  });
