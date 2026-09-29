import { Check, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui/Button';

type Props = { classCount: number; imageCount: number; taskCount: number; onPickClasses: () => void; onUpload: () => void; onNewTask: () => void };

// The three steps before annotators can start: classes, images, tasks
export function SetupChecklist({ classCount, imageCount, taskCount, onPickClasses, onUpload, onNewTask }: Props) {
  const steps = [
    { done: classCount > 0, text: classCount ? `${classCount} label classes` : 'No label classes', action: onPickClasses, label: 'Choose classes' },
    { done: imageCount > 0, text: imageCount ? `${imageCount} images` : 'No images', action: onUpload, label: 'Upload images' },
    { done: taskCount > 0, text: taskCount ? `${taskCount} tasks` : 'No tasks', action: onNewTask, label: 'Create a task' },
  ];
  const next = steps.find((step) => !step.done);

  return (
    <div className={cn('flex flex-col justify-between gap-3 rounded-xl border p-3.5 md:flex-row md:items-center', next ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/60')}>
      <div>
        <p className="text-xs font-bold">{next ? 'Project setup: finish these steps so annotators can start.' : 'Setup complete: annotators can work on their tasks.'}</p>
        <div className="mt-1 flex flex-wrap gap-4 text-[11px]">
          {steps.map((step, index) => (
            <span key={index} className={cn('flex items-center gap-1 font-medium', step.done ? 'text-emerald-700' : 'text-red-600')}>
              {step.done ? <Check size={12} /> : <X size={12} />} {index + 1}. {step.text}
            </span>
          ))}
        </div>
      </div>
      {next && <Button size="sm" onClick={next.action}>{next.label}</Button>}
    </div>
  );
}
