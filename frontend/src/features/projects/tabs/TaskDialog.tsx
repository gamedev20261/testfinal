import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi } from '../../../api/projects';
import { tasksApi } from '../../../api/tasks';
import { imagesApi } from '../../../api/images';
import { Dialog, DialogFooter } from '../../../components/ui/Dialog';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/cn';
import type { Task } from '../../../types/task';
import { useUsers } from '../../admin/queries';
import { projectKey, projectsKey, useProjectImages } from '../queries';

// Create a task (task = undefined) or edit one: a name, 1 annotator, 1 auditor and some images
export function TaskDialog({ projectId, task, onClose }: { projectId: string; task?: Task; onClose: () => void }) {
  const [name, setName] = useState(task?.name ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [annotatorId, setAnnotatorId] = useState(task?.annotator.id ?? '');
  const [auditorId, setAuditorId] = useState(task?.auditor.id ?? '');
  const [imageIds, setImageIds] = useState<string[]>(task?.imageIds ?? []);
  const { data: users = [] } = useUsers();
  const { data: images = [] } = useProjectImages(projectId);
  const queryClient = useQueryClient();

  const usable = images.filter((image) => image.status !== 'FAILED');
  const freeImages = usable.filter((image) => image.taskNames.length === 0).map((image) => image.id);
  const toggle = (id: string) => setImageIds(imageIds.includes(id) ? imageIds.filter((x) => x !== id) : [...imageIds, id]);

  const save = useMutation({
    mutationFn: () => {
      const input = { name, description, annotatorId, auditorId, imageIds };
      return task ? tasksApi.update(task.id, input) : projectsApi.createTask(projectId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKey(projectId) });
      queryClient.invalidateQueries({ queryKey: projectsKey });
      toast.success(task ? 'Task saved' : 'Task created. The annotator and auditor were notified.');
      onClose();
    },
  });

  const ready = name.trim() && annotatorId && auditorId && imageIds.length > 0;
  return (
    <Dialog open onClose={onClose} title={task ? `Edit ${task.name}` : 'New task'} description="Exactly 1 annotator and 1 auditor per task." wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-4"
      >
        <FormField label="Task name *" htmlFor="task-name">
          <Input id="task-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sector A" autoFocus />
        </FormField>
        <FormField label="Instructions" htmlFor="task-description">
          <Textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should the annotator mark?" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Annotator *" htmlFor="task-annotator">
            <Select id="task-annotator" value={annotatorId} onChange={(e) => setAnnotatorId(e.target.value)}>
              <option value="">Choose…</option>
              {users.filter((u) => u.role === 'ANNOTATOR').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Auditor *" htmlFor="task-auditor">
            <Select id="task-auditor" value={auditorId} onChange={(e) => setAuditorId(e.target.value)}>
              <option value="">Choose…</option>
              {users.filter((u) => u.role === 'AUDITOR').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </FormField>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Images * ({imageIds.length} selected)</span>
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setImageIds([...new Set([...imageIds, ...freeImages])])}>
              Add all images without a task ({freeImages.length})
            </button>
          </div>
          {usable.length === 0 ? (
            <p className="rounded border border-border p-4 text-center text-xs text-text-secondary">Upload images in the Imagery tab first.</p>
          ) : (
            <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto rounded border border-border p-2 sm:grid-cols-4">
              {usable.map((image) => {
                const selected = imageIds.includes(image.id);
                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => toggle(image.id)}
                    className={cn('relative overflow-hidden rounded border-2 text-left', selected ? 'border-primary' : 'border-transparent hover:border-border')}
                  >
                    {image.status === 'READY' ? (
                      <img src={imagesApi.thumbnailUrl(image.id)} alt="" className="h-20 w-full bg-slate-100 object-cover" />
                    ) : (
                      <div className="flex h-20 items-center justify-center bg-slate-100 text-[10px] text-text-secondary">Processing…</div>
                    )}
                    <p className="truncate px-1 py-0.5 text-[10px]" title={image.originalName}>{image.originalName}</p>
                    {image.taskNames.length > 0 && !selected && (
                      <p className="truncate px-1 pb-0.5 text-[9px] text-amber-700">In: {image.taskNames.join(', ')}</p>
                    )}
                    {selected && (
                      <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white"><Check size={12} /></span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!ready || save.isPending}>{save.isPending ? 'Saving…' : task ? 'Save task' : 'Create task'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
