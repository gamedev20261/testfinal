import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { projectsApi } from '../../api/projects';
import { Dialog, DialogFooter } from '../../components/ui/Dialog';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { confirm } from '../../components/ui/ConfirmDialog';
import type { Project, ProjectStatus } from '../../types/project';
import { projectKey, projectsKey } from './queries';

export function EditProjectDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const save = useMutation({
    mutationFn: () => projectsApi.update(project.id, { name, description, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKey(project.id) });
      queryClient.invalidateQueries({ queryKey: projectsKey });
      toast.success('Project saved');
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: () => projectsApi.remove(project.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey });
      toast.success('Project deleted');
      navigate('/');
    },
  });

  async function deleteProject() {
    const ok = await confirm({
      title: `Delete ${project.name}?`,
      message: 'Its tasks, images and shapes disappear from the app.',
      confirmLabel: 'Delete project',
      danger: true,
    });
    if (ok) remove.mutate();
  }

  return (
    <Dialog open onClose={onClose} title="Project details">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-4"
      >
        <FormField label="Name *" htmlFor="edit-project-name">
          <Input id="edit-project-name" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Description" htmlFor="edit-project-description">
          <Textarea id="edit-project-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <FormField label="Status" htmlFor="edit-project-status">
          <Select id="edit-project-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </FormField>
        <DialogFooter>
          <Button variant="danger" className="mr-auto" onClick={deleteProject}>Delete project</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!name.trim() || save.isPending}>Save</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
