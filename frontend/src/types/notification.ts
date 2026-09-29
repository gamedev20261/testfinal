export type Notification = {
  id: string;
  type: 'TASK_ASSIGNED' | 'TASK_SUBMITTED' | 'TASK_PASSED' | 'TASK_FAILED' | 'IMAGE_REJECTED';
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};
