"use client";

import { CircleNotch, Warning, WarningCircle, X } from "@phosphor-icons/react";
import { btn, type Size, type Variant } from "./styles";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";

// Small design-system primitives (docs/04 §4). No UI framework: Tailwind tokens from globals.css.

export { btn, inputCls } from "./styles";

export function Button({ variant = "primary", size = "md", busy, className = "", children, disabled, ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; busy?: boolean }) {
  return (
    <button {...rest} disabled={disabled || busy} aria-busy={busy || undefined} className={btn(variant, size, className)}>
      {busy && <CircleNotch className="animate-spin motion-reduce:animate-none" size={16} weight="bold" aria-hidden />}
      {children}
    </button>
  );
}


/** Label above, helper below, error below that (taste §4.6). */
export function Field({ label, helper, error, children, htmlFor }: { label: ReactNode; helper?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg">{label}</label>
      {children}
      {helper && !error && <p className="text-[13px] text-muted">{helper}</p>}
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

/** iOS-style segmented control, a radio group under the hood. */
export function Segmented<T extends string>({ value, onChange, options, name, label, size = "md", disabled }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; disabled?: boolean }[];
  name?: string; label: string; size?: "sm" | "md"; disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-[var(--radius-control)] bg-surface-2 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} disabled={disabled || o.disabled}
            onClick={() => onChange(o.value)}
            className={`press flex-1 rounded-[7px] font-medium transition-[background-color,box-shadow,color] duration-200 disabled:opacity-45 ${size === "sm" ? "h-7 px-2.5 text-[13px]" : "h-9 px-3 text-sm"} ${on ? "bg-surface text-fg shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_0.5px_var(--border-strong)]" : "text-muted hover:text-fg"}`}>
            {o.label}
          </button>
        );
      })}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-45 ${checked ? "bg-accent" : "bg-line-strong"}`}>
      <span className={`absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease)] ${checked ? "translate-x-4" : ""}`} />
    </button>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-[var(--radius-control)] ${className}`} />;
}

/** Inline status panel for warnings and errors: what happened, what to do. */
export function Notice({ tone = "warning", title, children, action }: { tone?: "warning" | "danger" | "neutral"; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const t = tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-surface-2 text-muted";
  const Icon = tone === "danger" ? WarningCircle : Warning;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`enter flex flex-col gap-3 rounded-[var(--radius-card)] p-4 sm:flex-row sm:items-center ${t}`}>
      <Icon size={20} weight="fill" className="shrink-0 self-start sm:self-center" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg">{title}</p>
        {children && <div className="mt-0.5 text-sm text-muted">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="enter flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">{icon}</div>
      <h2 className="title">{title}</h2>
      <p className="mt-1 max-w-[42ch] text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Bottom sheet on phones, right-side panel on desktop. Dims the page because it is modal. */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("textarea, input, button:not([data-close])")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="fade absolute inset-0 bg-black/35" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id}
        className="sheet absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[20px] bg-surface shadow-float md:inset-y-3 md:right-3 md:left-auto md:max-h-none md:w-[440px] md:rounded-[20px]">
        <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-3">
          <h2 id={id} className="title">{title}</h2>
          <button data-close onClick={onClose} aria-label="Close" className="press -mr-1.5 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2">
            <X size={18} weight="bold" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4">{footer}</div>}
      </div>
      <style>{`
        .sheet { animation: sheet-up 320ms var(--ease) both; }
        @media (min-width: 768px) { .sheet { animation-name: sheet-left; } }
        @keyframes sheet-up { from { transform: translateY(100%); } to { transform: none; } }
        @keyframes sheet-left { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .sheet { animation: fade-in 150ms ease both !important; } }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------- toasts (transient feedback only)
type Toast = { id: number; text: string; tone: "neutral" | "danger" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "neutral") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className={`enter pointer-events-auto max-w-md rounded-full px-4 py-2.5 text-sm shadow-float ${t.tone === "danger" ? "bg-danger text-white" : "bg-fg text-bg"}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Credit amount with tabular digits. */
export function Credits({ n, className = "" }: { n: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{n.toLocaleString()} {n === 1 ? "credit" : "credits"}</span>;
}
