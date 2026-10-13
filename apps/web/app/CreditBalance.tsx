"use client";

import { Coins } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/supabase";

const LOW = 100;

/** Live credit balance; updates from the private `user:<id>` broadcast emitted on every ledger insert. */
export function useBalance(): number | null {
  const supabase = useMemo(() => browserClient(), []);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from("credit_balances").select("balance").maybeSingle();
      if (alive) setBalance(data?.balance ?? 0);
    };
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await load();
      await supabase.realtime.setAuth();
      channel = supabase.channel(`user:${data.user.id}`, { config: { private: true } })
        .on("broadcast", { event: "ledger" }, () => void load())
        .subscribe();
    })();
    return () => {
      alive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return balance;
}

/** Compact pill (mobile top bar). */
export function CreditBalance() {
  const balance = useBalance();
  if (balance === null) return <span aria-hidden className="skeleton h-8 w-20 rounded-full" />;
  const low = balance < LOW;
  return (
    <Link href="/credits" title="1 credit = $0.01 of generation cost"
      className={`press fade inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium tabular-nums ${low ? "bg-warning-soft text-warning" : "bg-surface-2 text-fg"}`}>
      <Coins size={15} weight={low ? "fill" : "regular"} aria-hidden />
      {balance.toLocaleString()}
      <span className="sr-only"> credits{low ? ", running low" : ""}</span>
    </Link>
  );
}

/** Sidebar card: balance, roughly what it buys, and a link to the usage history. */
export function CreditCard() {
  const balance = useBalance();
  const low = balance !== null && balance < LOW;
  return (
    <div className="rounded-[16px] border border-line bg-surface p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted">Credits</span>
        <Coins size={15} className={low ? "text-warning" : "text-muted"} aria-hidden />
      </div>
      {balance === null
        ? <span aria-hidden className="skeleton mt-1.5 block h-7 w-20" />
        : <p className={`fade mt-1 text-[24px] leading-none font-semibold tracking-[-0.02em] tabular-nums ${low ? "text-warning" : ""}`}>{balance.toLocaleString()}</p>}
      <p className="mt-1 text-[12px] text-muted">{balance === null ? " " : `About ${Math.max(0, Math.floor(balance / 100))} Shorts at Budget`}</p>
      <Link href="/credits" className="press mt-3 flex h-8 items-center justify-center gap-1 rounded-full bg-surface-2 text-[13px] font-medium hover:bg-line">
        View usage
      </Link>
    </div>
  );
}
