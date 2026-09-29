import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { notificationsApi } from '../../api/notifications';
import { cn } from '../../lib/cn';
import { timeAgo } from '../../lib/format';
import type { Notification } from '../../types/notification';
import { Popover } from './Popover';

const notificationsKey = ['notifications'];

// The bell with the number of unread messages. Asks the server again every 30 seconds.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: notificationsKey, queryFn: notificationsApi.list, refetchInterval: 30_000 });
  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationsKey });

  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refresh });
  const markAllRead = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refresh });

  function openNotification(item: Notification) {
    if (!item.isRead) markRead.mutate(item.id);
    setOpen(false);
    if (item.link) navigate(item.link);
  }

  const unread = data?.unreadCount ?? 0;
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-alt"
        aria-label={`Notifications (${unread} unread)`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <Popover open={open} onClose={() => setOpen(false)} className="w-80 max-w-[calc(100vw-1rem)]">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline">
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!data?.notifications.length && <p className="p-6 text-center text-xs text-text-secondary">No notifications yet</p>}
          {data?.notifications.map((item) => (
            <button
              key={item.id}
              onClick={() => openNotification(item)}
              className={cn('block w-full border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-surface-alt', !item.isRead && 'bg-primary-light/60')}
            >
              <div className="flex items-center gap-2">
                {!item.isRead && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                <span className="text-xs font-semibold">{item.title}</span>
                <span className="ml-auto text-[10px] whitespace-nowrap text-text-secondary">{timeAgo(item.createdAt)}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{item.message}</p>
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}
