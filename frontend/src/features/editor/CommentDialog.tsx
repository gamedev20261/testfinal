import { useState } from 'react';
import { Dialog, DialogFooter } from '../../components/ui/Dialog';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';

type Props = {
  title: string;
  description?: string;
  confirmLabel: string;
  required?: boolean;
  onSubmit: (comment: string) => void;
  onClose: () => void;
};

// Asks the auditor for a reason (reject a shape or image, fail a task)
export function CommentDialog({ title, description, confirmLabel, required = true, onSubmit, onClose }: Props) {
  const [comment, setComment] = useState('');
  return (
    <Dialog open onClose={onClose} title={title} description={description}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(comment.trim());
          onClose();
        }}
      >
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What should the annotator fix?" aria-label="Reason" autoFocus />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={required && !comment.trim()}>{confirmLabel}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
