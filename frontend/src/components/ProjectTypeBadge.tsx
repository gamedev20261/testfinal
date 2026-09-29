import { Badge } from './ui/Badge';
import type { ProjectType } from '../types/project';

export const projectTypeLabel = (type: ProjectType) => (type === 'DETECTION' ? 'Object Detection' : 'Segmentation');

export function ProjectTypeBadge({ type }: { type: ProjectType }) {
  return (
    <Badge tone={type === 'DETECTION' ? 'blue' : 'green'} className="uppercase tracking-wider text-[10px]">
      {projectTypeLabel(type)}
    </Badge>
  );
}
