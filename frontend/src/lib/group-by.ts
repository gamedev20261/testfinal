// Groups items by a name, sorted by that name, with items without a group last:
//   groupBy(users, (u) => u.groupName, 'No group') → [['Field team', [...]], ['No group', [...]]]
export function groupBy<T>(items: T[], nameOf: (item: T) => string | null | undefined, fallback: string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = nameOf(item) || fallback;
    groups.set(name, [...(groups.get(name) ?? []), item]);
  }
  return [...groups.entries()].sort(([a], [b]) => (a === fallback ? 1 : b === fallback ? -1 : a.localeCompare(b)));
}
