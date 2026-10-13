// Server-safe style helpers (usable from Server and Client Components).

export type Variant = "primary" | "secondary" | "ghost" | "danger";
export type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface text-fg border border-line-strong hover:bg-surface-2",
  ghost: "text-fg hover:bg-surface-2",
  danger: "bg-surface text-danger border border-line-strong hover:bg-danger-soft",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px] gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-[16px] gap-2",
};

/** Class string for buttons and button-styled links. */
export function btn(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `press inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium disabled:pointer-events-none disabled:opacity-45 ${VARIANT[variant]} ${SIZE[size]} ${extra}`;
}

export const inputCls =
  "w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 py-2 text-[15px] text-fg placeholder:text-muted/80 transition-colors focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-accent-soft";
