"use client";

import { Coins, FilmStrip, List, Plus, SignOut, Sparkle, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLockup } from "@/components/BrandMark";
import { browserClient } from "@/lib/supabase";
import { CreditBalance, CreditCard } from "./CreditBalance";

/** Signed-in app frame, in the style of creative tools (Runway, Luma, Krea):
 *  a persistent left sidebar with Create first, the library, credits and the account. */
export function AppShell({ email, children }: { email: string | null; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [path]);

  async function signOut() {
    await browserClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const nav = [
    { href: "/new", label: "Create", icon: Sparkle, active: path.startsWith("/new") },
    { href: "/", label: "Library", icon: FilmStrip, active: path === "/" || path.startsWith("/projects") },
    { href: "/credits", label: "Credits", icon: Coins, active: path.startsWith("/credits") },
  ];

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between px-1 pt-1">
        <Link href="/" className="press rounded-md text-fg"><BrandLockup /></Link>
        <button onClick={() => setOpen(false)} aria-label="Close menu" className="press rounded-full p-1.5 text-muted hover:bg-surface-2 lg:hidden"><X size={18} /></button>
      </div>
      <Link href="/new" className="press flex h-11 items-center justify-center gap-2 rounded-full bg-fg text-[14px] font-medium text-bg hover:bg-fg/90">
        <Plus size={16} weight="bold" aria-hidden /> New video
      </Link>
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={n.active ? "page" : undefined}
            className={`press flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium ${n.active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/70 hover:text-fg"}`}>
            <n.icon size={18} weight={n.active ? "fill" : "regular"} className={n.active ? "text-accent" : ""} aria-hidden /> {n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <CreditCard />
        <div className="flex items-center gap-2.5 rounded-[12px] px-2 py-1.5">
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent uppercase">
            {(email ?? "?").slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{email}</span>
          <button onClick={signOut} aria-label="Sign out" title="Sign out" className="press rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
            <SignOut size={17} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line bg-surface lg:block">{sidebar}</aside>

      {/* mobile top bar + drawer */}
      <header className="material-bar sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line px-4 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="press -ml-1.5 rounded-full p-1.5 hover:bg-surface-2"><List size={22} /></button>
        <Link href="/" className="text-fg"><BrandLockup /></Link>
        <div className="ml-auto"><CreditBalance /></div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fade absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <aside className="drawer absolute inset-y-0 left-0 w-[280px] bg-surface shadow-float">{sidebar}</aside>
          <style>{`.drawer{animation:drawer-in 280ms var(--ease) both}@keyframes drawer-in{from{transform:translateX(-100%)}to{transform:none}}@media (prefers-reduced-motion: reduce){.drawer{animation:fade-in 150ms ease both}}`}</style>
        </div>
      )}

      <div className="lg:pl-[248px]">{children}</div>
    </div>
  );
}
