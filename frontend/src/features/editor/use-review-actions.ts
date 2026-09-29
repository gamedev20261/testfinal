import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksApi } from '../../api/tasks';
import { labelsApi } from '../../api/labels';
import type { Label } from '../../types/label';
import { labelsKey, taskKey } from './queries';

// The auditor's actions, and the annotator's start / submit
export function useReviewActions(taskId: string, imageId: string) {
  const queryClient = useQueryClient();
  const refreshTask = () => {
    queryClient.invalidateQueries({ queryKey: taskKey(taskId) }); // the task and all its label lists
    queryClient.invalidateQueries({ queryKey: ['tasks', 'mine'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };
  const putLabel = (label: Label) =>
    queryClient.setQueryData<Label[]>(labelsKey(taskId, imageId), (old = []) => old.map((l) => (l.id === label.id ? label : l)));

  return {
    reviewLabel: useMutation({
      mutationFn: ({ id, status, comment }: { id: string; status: 'APPROVED' | 'REJECTED'; comment?: string }) =>
        labelsApi.review(id, status, comment),
      onSuccess: (label) => {
        putLabel(label);
        queryClient.invalidateQueries({ queryKey: taskKey(taskId), exact: true });
      },
    }),
    approveAll: useMutation({
      mutationFn: () => tasksApi.approveAll(taskId, imageId),
      onSuccess: (count) => {
        toast.success(`${count} shape(s) approved`);
        refreshTask();
      },
    }),
    reviewImage: useMutation({
      mutationFn: ({ result, comment }: { result: 'APPROVED' | 'REJECTED'; comment: string }) =>
        tasksApi.reviewImage(taskId, imageId, result, comment),
      onSuccess: (_data, { result }) => {
        toast.success(result === 'APPROVED' ? 'Image approved' : 'Image rejected');
        refreshTask();
      },
    }),
    reviewTask: useMutation({
      mutationFn: ({ result, comment }: { result: 'PASSED' | 'FAILED'; comment: string }) => tasksApi.review(taskId, result, comment),
      onSuccess: (_data, { result }) => {
        toast.success(result === 'PASSED' ? 'Task passed' : 'Task sent back to the annotator');
        refreshTask();
      },
    }),
    start: useMutation({ mutationFn: () => tasksApi.start(taskId), onSuccess: refreshTask }),
    submit: useMutation({
      mutationFn: () => tasksApi.submit(taskId),
      onSuccess: () => {
        toast.success('Submitted for review');
        refreshTask();
      },
    }),
  };
}
