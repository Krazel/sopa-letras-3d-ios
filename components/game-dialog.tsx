import { useEffect, useRef, type ReactNode } from 'react';
import { playSound } from '@/lib/audio';

export default function GameDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
      // Long localized help must open at its heading/close control, even after
      // the player previously scrolled to its final action.
      dialog
        .querySelector<HTMLButtonElement>('.dialog-close')
        ?.focus({ preventScroll: true });
      dialog.scrollTop = 0;
    } else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      className="game-dialog"
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        void playSound('ui');
        onClose();
      }}
    >
      <div className="dialog-content">{children}</div>
    </dialog>
  );
}
