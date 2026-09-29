import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { projectsApi } from '../../api/projects';
import { Dialog, DialogFooter } from '../../components/ui/Dialog';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { LabelClassPicker } from '../../components/LabelClassPicker';
import { cn } from '../../lib/cn';
import type { ProjectType } from '../../types/project';
import { useLabelClasses } from '../admin/queries';
import { projectsKey } from './queries';

const TYPES: { value: ProjectType; title: string; hint: string }[] = [
  { value: 'DETECTION', title: 'Object Detection', hint: 'Boxes and rotated boxes' },
  { value: 'SEGMENTATION', title: 'Segmentation', hint: 'Polygons: drawn, magic pen or brush' },
];

export function CreateProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProjectType>('DETECTION');
  const [labelClassIds, setLabelClassIds] = useState<string[]>([]);
  const { data: classes = [] } = useLabelClasses();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectsKey });
      toast.success('Project created');
      onClose();
      navigate(`/projects/${project.id}`);
    },
  });

  return (
    <Dialog open={open} onClose={onClose} title="New project" description="Next you upload images and create tasks." wide>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ name, description, type, labelClassIds });
        }}
        className="space-y-4"
      >
        <FormField label="Project name *" htmlFor="project-name">
          <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lahore buildings 2026" autoFocus />
        </FormField>
        <FormField label="Description" htmlFor="project-description">
          <Textarea id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>

        <div>
          <p className="mb-1 text-xs font-medium text-text-secondary">Type *</p>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors',
                  type === option.value ? 'border-primary bg-primary-light' : 'border-border hover:border-primary/50',
                )}
              >
                <span className="block text-sm font-semibold">{option.title}</span>
                <span className="text-xs text-text-secondary">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-text-secondary">Label classes ({labelClassIds.length} selected)</p>
          <LabelClassPicker classes={classes} selected={labelClassIds} onChange={setLabelClassIds} />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create project'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
