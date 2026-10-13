"use client";

import { Coins, FilmStrip, Plus, SignOut, UserCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { btn } from "@/components/ui";
import { browserClient } from "@/lib/supabase";
import { CreditBalance } from "./CreditBalance";

/** Translucent top bar; content scrolls underneath (apple-design §12). */
export function AppBar({ signedIn, email }: { signedIn: boolean; email: string | null }) {
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  async function signOut() {
    await browserClient().auth.signOut();
    setMenu(false);
    router.push("/");
    router.refresh();
  }

  const nav = [
    { href: "/", label: "Library", icon: FilmStrip, active: path === "/" || path.startsWith("/projects") },
    { href: "/credits", label: "Credits", icon: Coins, active: path.startsWith("/credits") },
  ];

  return (
    <header className="material-bar sticky top-0 z-30 border-b border-line">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="mr-3 flex items-center gap-2 font-semibold tracking-[-0.01em]">
          <span aria-hidden className="h-5 w-5 rounded-[6px] bg-[conic-gradient(from_200deg,var(--accent),color-mix(in_oklab,var(--accent),white_45%),var(--accent))]" />
          Lumen
        </Link>
        {signedIn && (
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} aria-current={n.active ? "page" : undefined}
                className={`press rounded-full px-3 py-1.5 text-sm font-medium ${n.active ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <>
              <CreditBalance />
              {path !== "/new" && (
                <Link href="/new" aria-label="New video" className={btn("primary", "sm", "max-sm:w-8 max-sm:px-0")}>
                  <Plus size={15} weight="bold" aria-hidden /><span className="max-sm:sr-only">New video</span>
                </Link>
              )}
              <div ref={menuRef} className="relative">
                <button onClick={() => setMenu((m) => !m)} aria-label="Account" aria-expanded={menu}
                  className="press flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg">
                  <UserCircle size={24} />
                </button>
                {menu && (
                  <div role="menu" className="enter absolute right-0 mt-2 w-60 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface p-1.5 shadow-float">
                    {email && <p className="truncate px-2.5 py-2 text-[13px] text-muted">{email}</p>}
                    <div className="sm:hidden">
                      {[{ href: "/new", label: "New video", icon: Plus }, ...nav].map((n) => (
                        <Link key={n.href} href={n.href} role="menuitem" onClick={() => setMenu(false)}
                          className="flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-sm hover:bg-surface-2">
                          <n.icon size={17} aria-hidden /> {n.label}
                        </Link>
                      ))}
                    </div>
                    <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-sm hover:bg-surface-2">
                      <SignOut size={17} aria-hidden /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            path !== "/login" && <Link href="/login" className={btn("secondary", "sm")}>Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
