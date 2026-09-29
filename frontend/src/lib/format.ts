// Small helpers that turn values into text for the screen

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

// "5 minutes ago", "yesterday", "3 days ago"
export function timeAgo(date: string | Date) {
  const seconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export const formatDate = (date: string | Date) => new Date(date).toLocaleDateString();

// 1536 → "1.5 KB"
export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export const initial = (name: string) => name.charAt(0).toUpperCase();
