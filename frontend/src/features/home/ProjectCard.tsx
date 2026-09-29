import { Link } from 'react-router';
import { ArrowRight, Check, Clock } from 'lucide-react';
import { imagesApi } from '../../api/images';
import { ProjectTypeBadge } from '../../components/ProjectTypeBadge';
import { Badge } from '../../components/ui/Badge';
import { timeAgo } from '../../lib/format';
import type { ProjectSummary } from '../../types/project';
import type { User } from '../../types/user';

// Admins open the project's management page; annotators and auditors open their task
function cardLink(project: ProjectSummary, user: User) {
  if (user.role === 'ADMIN') return { to: `/projects/${project.id}`, action: 'Manage' };
  if (project.myTaskId) return { to: `/tasks/${project.myTaskId}`, action: user.role === 'AUDITOR' ? 'Review' : 'Open' };
  return { to: '/tasks', action: 'Open' };
}

export function ProjectCard({ project, user }: { project: ProjectSummary; user: User }) {
  const { to, action } = cardLink(project, user);
  return (
    <Link
      to={to}
      className="flex flex-col justify-between rounded-xl border border-border bg-white p-4 shadow-xs transition-all hover:border-primary/60 hover:shadow-md"
    >
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <ProjectTypeBadge type={project.type} />
          {project.status === 'ARCHIVED' && <Badge>Archived</Badge>}
          {user.role !== 'ADMIN' && project.myTaskId && (
            <Badge tone="blue">
              <Check size={10} /> Assigned
            </Badge>
          )}
        </div>
        <h3 className="mb-1 truncate text-base font-semibold">{project.name}</h3>
        {project.description && <p className="mb-3 line-clamp-2 text-xs text-text-secondary">{project.description}</p>}

        {project.thumbnailImageIds.length > 0 && (
          <div className="mb-3 flex gap-1.5">
            {project.thumbnailImageIds.map((id) => (
              <img key={id} src={imagesApi.thumbnailUrl(id)} alt="" loading="lazy" className="h-12 w-12 rounded-lg border border-border bg-slate-100 object-cover" />
            ))}
          </div>
        )}

        {project.annotators.length > 0 && (
          <p className="mb-3 truncate text-[11px] text-text-secondary">
            <span className="font-medium text-slate-700">Annotators:</span> {project.annotators.map((a) => a.name).join(', ')}
          </p>
        )}

        <div className="flex gap-4 border-t border-border py-2 text-xs text-text-secondary">
          <span><strong className="text-text-primary">{project.imageCount}</strong> Images</span>
          <span><strong className="text-text-primary">{project.taskCount}</strong> Tasks</span>
          <span><strong className="text-text-primary">{project.labelCount}</strong> Labels</span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock size={12} /> {timeAgo(project.lastActivityAt)}
        </span>
        <span className="flex items-center gap-1 font-semibold text-primary">
          {action} <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}
