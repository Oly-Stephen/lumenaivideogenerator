"use client";

import { ArrowSquareOut, CaretDown, Gift } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { relativeTime } from "@/lib/stages";

export interface LedgerRow {
  id: number;
  created_at: string;
  reason: string;
  delta: number;
  note: string | null;
  project_id: string | null;
  title: string | null;
}

const REASON: Record<string, string> = {
  grant: "Added", purchase: "Purchase", reservation: "Held", reservation_release: "Returned",
  charge: "Used", refund: "Refunded", adjustment: "Adjustment",
};

interface Group { key: string; title: string; projectId: string | null; last: string; used: number; returned: number; net: number; rows: LedgerRow[] }

/** One row per video (used and returned), expandable to the individual ledger entries. Account-level rows stand alone. */
function group(rows: LedgerRow[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const key = r.project_id ?? `row-${r.id}`;
    const g = map.get(key) ?? { key, title: r.project_id ? (r.title ?? "Untitled video") : (REASON[r.reason] ?? r.reason), projectId: r.project_id, last: r.created_at, used: 0, returned: 0, net: 0, rows: [] };
    g.rows.push(r);
    g.last = r.created_at;
    g.net += r.delta;
    if (r.reason === "charge") g.used += -r.delta;
    if (r.reason === "refund") g.returned += r.delta;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
}

export function CreditHistory({ rows }: { rows: LedgerRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = group(rows);
  if (!groups.length) return <p className="mt-10 text-center text-muted">No activity yet.</p>;
  return (
    <section className="mt-10">
      <h2 className="title">History</h2>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {groups.map((g) => {
          const isOpen = open === g.key;
          const video = !!g.projectId;
          return (
            <li key={g.key}>
              <button onClick={() => video && setOpen(isOpen ? null : g.key)} aria-expanded={video ? isOpen : undefined} disabled={!video}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left enabled:hover:bg-surface-2/60">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {!video && <Gift size={15} className="text-accent" aria-hidden />}
                    <span className="truncate">{g.title}</span>
                  </p>
                  <p className="text-[13px] text-muted">
                    {relativeTime(g.last)}
                    {video && `, ${g.used} used`}
                    {!video && g.rows[0]?.note ? `, ${g.rows[0].note}` : ""}
                  </p>
                </div>
                <span className={`text-sm font-medium tabular-nums ${g.net > 0 ? "text-accent" : ""}`}>{g.net > 0 ? "+" : ""}{g.net.toLocaleString()}</span>
                {video && <CaretDown size={14} className={`shrink-0 text-muted transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} aria-hidden />}
              </button>
              {isOpen && (
                <div className="enter border-t border-line bg-surface-2/50 px-4 py-3">
                  <table className="w-full text-[13px]">
                    <tbody>
                      {[...g.rows].reverse().map((r) => (
                        <tr key={r.id}>
                          <td className="py-1 pr-3 whitespace-nowrap text-muted">{new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                          <td className="py-1 pr-3">{REASON[r.reason] ?? r.reason}</td>
                          <td className="py-1 text-right tabular-nums">{r.delta > 0 ? "+" : ""}{r.delta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Link href={`/projects/${g.projectId}`} className="mt-2 inline-flex items-center gap-1 text-[13px] text-accent hover:underline">
                    Open video <ArrowSquareOut size={12} aria-hidden />
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
