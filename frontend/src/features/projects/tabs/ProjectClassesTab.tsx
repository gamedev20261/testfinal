import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi } from '../../../api/projects';
import { Button } from '../../../components/ui/Button';
import { LabelClassPicker } from '../../../components/LabelClassPicker';
import type { Project } from '../../../types/project';
import { useLabelClasses } from '../../admin/queries';
import { projectKey } from '../queries';

// Which classes of the catalogue this project uses
export function ProjectClassesTab({ project }: { project: Project }) {
  const { data: classes = [] } = useLabelClasses();
  const [selected, setSelected] = useState(project.labelClasses.map((c) => c.id));
  const queryClient = useQueryClient();
  const changed = selected.length !== project.labelClasses.length || project.labelClasses.some((c) => !selected.includes(c.id));

  const save = useMutation({
    mutationFn: () => projectsApi.setLabelClasses(project.id, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKey(project.id) });
      toast.success('Label classes saved');
    },
  });

  return (
    <div className="max-w-3xl space-y-4 rounded-xl border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Tag size={16} className="text-primary" /> Label classes of this project</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Annotators can only draw these. New classes are created in the Admin Portal.</p>
        </div>
        <Button size="sm" disabled={!changed || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : `Save (${selected.length} selected)`}
        </Button>
      </div>
      <LabelClassPicker classes={classes} selected={selected} onChange={setSelected} />
    </div>
  );
}
