"use client";

import { Coins } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/supabase";

const LOW = 100;

/** Header balance; updates live from the private `user:<id>` broadcast emitted on every ledger insert. */
export function CreditBalance() {
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

  if (balance === null) return <span aria-hidden className="skeleton h-8 w-24 rounded-full" />;
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
