import { Check, Play, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { confirm } from '../../components/ui/ConfirmDialog';
import type { TaskDetail } from '../../types/task';
import type { EditorMode } from './editor-mode';
import { useReviewActions } from './use-review-actions';
import { useCurrentImage } from './use-current-image';

type Props = { detail: TaskDetail; mode: EditorMode; onRejectImage: () => void; onFailTask: () => void };

// Start / Submit for the annotator; Approve / Reject image and Pass / Fail task for the auditor
export function WorkflowButtons({ detail, mode, onRejectImage, onFailTask }: Props) {
  const { task } = detail;
  const image = useCurrentImage(detail);
  const actions = useReviewActions(task.id, image?.id ?? '');

  async function submit() {
    const ok = await confirm({
      title: 'Submit for review?',
      message: 'The auditor will check your shapes. You cannot change them until the review is done.',
      confirmLabel: 'Submit',
    });
    if (ok) actions.submit.mutate();
  }

  async function pass() {
    const ok = await confirm({ title: 'Pass the whole task?', message: 'Every shape not reviewed yet is approved.', confirmLabel: 'Pass task' });
    if (ok) actions.reviewTask.mutate({ result: 'PASSED', comment: '' });
  }

  if (mode.canReview) {
    return (
      <>
        {image && image.reviewStatus !== 'APPROVED' && (
          <Button size="sm" variant="secondary" onClick={() => actions.reviewImage.mutate({ result: 'APPROVED', comment: '' })}>
            <ThumbsUp size={13} /> Approve image
          </Button>
        )}
        {image && image.reviewStatus !== 'REJECTED' && (
          <Button size="sm" variant="secondary" onClick={onRejectImage}><ThumbsDown size={13} /> Reject image</Button>
        )}
        <Button size="sm" variant="success" onClick={pass}><Check size={13} /> Pass task</Button>
        <Button size="sm" variant="danger" onClick={onFailTask}><X size={13} /> Fail task</Button>
      </>
    );
  }

  if (mode.canEdit && mode.isAnnotator) {
    return task.status === 'NOT_STARTED' ? (
      <Button size="sm" onClick={() => actions.start.mutate()}><Play size={13} /> Start task</Button>
    ) : (
      <Button size="sm" variant="success" onClick={submit} disabled={actions.submit.isPending}><Send size={13} /> Submit for review</Button>
    );
  }
  return null;
}
