import { BRAND_SLUG } from "@/lib/brand";

// Brand symbol (brand-research §14A): one rounded frame with a small "card" lifted out of its
// top-right corner, the way a scene is presented. Monochrome by default (currentColor).
export function BrandMark({ size = 22, className = "", title }: { size?: number; className?: string; title?: string }) {
  const id = `bm-cut-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <mask id={id}>
          <rect width="32" height="32" fill="#fff" />
          <rect x="18.5" y="0.5" width="13" height="13" rx="4" fill="#000" />
        </mask>
      </defs>
      <rect x="2" y="5" width="26" height="24" rx="7.5" fill="currentColor" mask={`url(#${id})`} />
      <rect x="21" y="3" width="8" height="8" rx="2.4" fill="currentColor" />
    </svg>
  );
}

/** Symbol + lowercase wordmark. */
export function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark size={22} />
      <span className="text-[17px] font-semibold tracking-[-0.025em]">{BRAND_SLUG}</span>
    </span>
  );
}
