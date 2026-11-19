import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Status } from '../types';
import { IconX } from './icons';

export function Chip({
  on,
  onClick,
  children,
  tone,
  size,
  count,
  title,
}: {
  on?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tone?: 'pos' | 'type' | 'tag' | 'col';
  size?: 'md' | 'lg';
  count?: number;
  title?: string;
}) {
  const cls = ['chip', tone, on && 'on', size === 'lg' && 'lg', count === 0 && !on && 'zero'].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} aria-pressed={!!on} onClick={onClick} title={title}>
      {children}
      {count != null && <span className="count">{count}</span>}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  labels,
  value,
  onChange,
  allowNone,
  size,
  stack,
  prefix,
  label,
}: {
  options: readonly T[];
  labels: Record<T, ReactNode>;
  value: T | null;
  onChange: (v: T | null) => void;
  allowNone?: boolean;
  size?: 'md' | 'lg';
  stack?: boolean;
  prefix?: (v: T) => ReactNode;
  label?: string;
}) {
  return (
    <div className={['seg', size === 'lg' && 'lg', stack && 'stack'].filter(Boolean).join(' ')} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          className={value === o ? 'on' : undefined}
          onClick={() => onChange(allowNone && value === o ? null : o)}
        >
          {prefix?.(o)}
          <span>{labels[o]}</span>
        </button>
      ))}
    </div>
  );
}

export function Group({ label, hint, children, id }: { label: string; hint?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="group" aria-label={label} id={id}>
      <div className="eyebrow">
        {label}
        {hint && <span className="hint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/** Spodný panel (na desktope dialóg). Zatvára Esc, klik mimo a tlačidlo ×. */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  full,
  headExtra,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  full?: boolean;
  headExtra?: ReactNode;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.dialog-backdrop')) closeRef.current();
    };
    window.addEventListener('keydown', k);
    panel.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', k);
    };
  }, []);
  return createPortal(
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeRef.current()}>
      <section ref={panel} tabIndex={-1} className={`sheet${full ? ' full' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <header className="sheet-head">
          <h2 className="display">{title}</h2>
          {headExtra}
          <button type="button" className="icon-btn ghost" onClick={() => closeRef.current()} aria-label="Zavrieť">
            <IconX />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}

/** Malý opasok = stav reelu: nové (biely), na drilovanie (modrý), naučené (čierny s červenou páskou). */
export function Belt({ status }: { status: Status }) {
  return <span className={`belt ${status}`} aria-hidden="true" />;
}

/** Pokrok triedenia ako biely opasok: plní sa, za každých 25 % pribudne stripe. */
export function ProgressBelt({ done, total, fresh }: { done: number; total: number; fresh?: number }) {
  const pct = total ? Math.min(1, done / total) : 0;
  const stripes = Math.floor(pct * 4 + 1e-9);
  return (
    <div
      className="pbelt"
      role="progressbar"
      aria-label="Vytriedená časť knižnice"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
    >
      <div className="pbelt-band">
        <div className="pbelt-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="pbelt-bar">
        {[0, 1, 2, 3].map((i) => {
          // stripy pribúdajú od konca opasku
          const n = 4 - i;
          const on = n <= stripes;
          return <span key={i} className={[on && 'on', on && fresh === n && 'fresh'].filter(Boolean).join(' ')} />;
        })}
      </div>
    </div>
  );
}

export function BrandMark() {
  return <span className="brand-mark" aria-hidden="true" />;
}
