import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastMsg {
  text: string;
  tone?: 'error';
  action?: { label: string; run: () => void };
}
interface ConfirmOpts {
  title: string;
  body?: string;
  confirm?: string;
  cancel?: string;
  danger?: boolean;
}

const ToastCtx = createContext<(t: ToastMsg | string) => void>(() => {});
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);

export const useToast = () => useContext(ToastCtx);
export const useConfirm = () => useContext(ConfirmCtx);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastMsg & { id: number }) | null>(null);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((t: ToastMsg | string) => {
    const msg = typeof t === 'string' ? { text: t } : t;
    const id = Date.now() + Math.random();
    window.clearTimeout(timer.current);
    setToast({ ...msg, id });
    timer.current = window.setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), msg.action || msg.tone ? 6500 : 3200);
  }, []);

  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })), []);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <ToastCtx.Provider value={show}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        {toast && (
          <div className={`toast ${toast.tone ?? ''}`} role={toast.tone === 'error' ? 'alert' : 'status'} key={toast.id}>
            <span>{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
        {dialog && <ConfirmDialog opts={dialog} onClose={close} />}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

function ConfirmDialog({ opts, onClose }: { opts: ConfirmOpts; onClose: (v: boolean) => void }) {
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    okRef.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
        <h2 id="dlg-title">{opts.title}</h2>
        {opts.body && <p>{opts.body}</p>}
        <div className="dialog-row">
          <button type="button" className="btn ghost" onClick={() => onClose(false)}>
            {opts.cancel ?? 'Zrušiť'}
          </button>
          <button type="button" ref={okRef} className={`btn ${opts.danger ? 'danger solid' : 'primary'}`} onClick={() => onClose(true)}>
            {opts.confirm ?? 'Pokračovať'}
          </button>
        </div>
      </div>
    </div>
  );
}
