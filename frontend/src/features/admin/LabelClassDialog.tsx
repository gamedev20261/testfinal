import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { labelClassesApi } from '../../api/label-classes';
import { Dialog, DialogFooter } from '../../components/ui/Dialog';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import type { LabelClass, LabelGroup } from '../../types/project';
import { labelClassesKey } from './queries';

// Colours offered for a new class; any other can be picked too
const PALETTE = ['#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#319795', '#3182ce', '#5a67d8', '#805ad5', '#d53f8c', '#718096'];

export function LabelClassDialog({ labelClass, groups, onClose }: { labelClass?: LabelClass; groups: LabelGroup[]; onClose: () => void }) {
  const [name, setName] = useState(labelClass?.name ?? '');
  const [color, setColor] = useState(labelClass?.color ?? PALETTE[0]);
  const [groupId, setGroupId] = useState(labelClass?.groupId ?? '');
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () => {
      const input = { name, color, groupId: groupId || null };
      return labelClass ? labelClassesApi.update(labelClass.id, input) : labelClassesApi.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelClassesKey });
      toast.success(labelClass ? 'Label class saved' : 'Label class created');
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title={labelClass ? `Edit ${labelClass.name}` : 'Create label class'}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-4"
      >
        <FormField label="Name *" htmlFor="class-name">
          <Input id="class-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Building" autoFocus />
        </FormField>
        <div>
          <p className="mb-1 text-xs font-medium text-text-secondary">Colour *</p>
          <div className="flex flex-wrap items-center gap-2">
            {PALETTE.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setColor(option)}
                aria-label={`Colour ${option}`}
                className="h-7 w-7 rounded-full ring-offset-2"
                style={{ backgroundColor: option, boxShadow: option === color ? `0 0 0 2px white, 0 0 0 4px ${option}` : undefined }}
              />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Other colour" className="h-7 w-10 cursor-pointer" />
            <span className="font-mono text-xs text-text-secondary">{color}</span>
          </div>
        </div>
        <FormField label="Group" htmlFor="class-group">
          <Select id="class-group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">No group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </Select>
        </FormField>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!name.trim() || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
