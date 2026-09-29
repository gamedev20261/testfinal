import type { ProjectSummary, ProjectType } from '../../types/project';

export type TypeFilter = 'ALL' | ProjectType;
export type SortKey = keyof typeof SORTS;

const time = (date: string) => new Date(date).getTime();

// Each sort option, and how it compares two projects
export const SORTS = {
  recent: { label: 'Date modified', compare: (a: ProjectSummary, b: ProjectSummary) => time(b.lastActivityAt) - time(a.lastActivityAt) },
  az: { label: 'A to Z', compare: (a: ProjectSummary, b: ProjectSummary) => a.name.localeCompare(b.name) },
  za: { label: 'Z to A', compare: (a: ProjectSummary, b: ProjectSummary) => b.name.localeCompare(a.name) },
  newest: { label: 'Newest first', compare: (a: ProjectSummary, b: ProjectSummary) => time(b.createdAt) - time(a.createdAt) },
  oldest: { label: 'Oldest first', compare: (a: ProjectSummary, b: ProjectSummary) => time(a.createdAt) - time(b.createdAt) },
  images: { label: 'Most images', compare: (a: ProjectSummary, b: ProjectSummary) => b.imageCount - a.imageCount },
  tasks: { label: 'Most tasks', compare: (a: ProjectSummary, b: ProjectSummary) => b.taskCount - a.taskCount },
};

export function filterProjects(projects: ProjectSummary[], search: string, type: TypeFilter, sort: SortKey) {
  const text = search.trim().toLowerCase();
  return projects
    .filter((p) => type === 'ALL' || p.type === type)
    .filter((p) => !text || p.name.toLowerCase().includes(text) || p.description.toLowerCase().includes(text))
    .sort(SORTS[sort].compare);
}
