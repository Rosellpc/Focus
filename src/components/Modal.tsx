import { useEffect, useRef, type ReactNode } from "react";
export function Modal({
  children,
  titleId,
  onClose,
  busy,
}: {
  children: ReactNode;
  titleId: string;
  onClose: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto w-[min(90vw,440px)] max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-slate-950 text-slate-100 p-6 shadow-2xl backdrop:bg-black/70"
    >
      {children}
    </dialog>
  );
}
