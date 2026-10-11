"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { browserClient } from "@/lib/supabase";

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

  if (balance === null) return null;
  return (
    <Link href="/credits" className="rounded-full border border-black/10 px-3 py-1 text-sm dark:border-white/15" title="Credits (1 credit = $0.01)">
      {balance.toLocaleString()} credits
    </Link>
  );
}
