import { create } from 'zustand';
import { Dialog, DialogFooter } from './Dialog';
import { Button } from './Button';

type ConfirmOptions = { title: string; message: string; confirmLabel?: string; danger?: boolean };

type ConfirmState = {
  options: ConfirmOptions | null;
  resolve: (answer: boolean) => void;
};

const useConfirmStore = create<ConfirmState>(() => ({ options: null, resolve: () => {} }));

// Asks "are you sure?" and waits for the answer:
//   if (await confirm({ title: 'Delete user?', message: '…', danger: true })) { … }
export function confirm(options: ConfirmOptions) {
  return new Promise<boolean>((resolve) => useConfirmStore.setState({ options, resolve }));
}

// Placed once in the app shell; shows whatever confirm() asked
export function ConfirmHost() {
  const { options, resolve } = useConfirmStore();
  const answer = (value: boolean) => {
    resolve(value);
    useConfirmStore.setState({ options: null });
  };
  return (
    <Dialog open={!!options} onClose={() => answer(false)} title={options?.title}>
      <p className="text-sm text-text-secondary whitespace-pre-line">{options?.message}</p>
      <DialogFooter>
        <Button variant="secondary" onClick={() => answer(false)}>
          Cancel
        </Button>
        <Button variant={options?.danger ? 'danger' : 'primary'} onClick={() => answer(true)} autoFocus>
          {options?.confirmLabel ?? 'Confirm'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
