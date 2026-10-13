"use client";

import { ArrowUp, DeviceMobile, Monitor, Sparkle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const EXAMPLES = [
  "What if you never slept again?",
  "Why do cats purr?",
  "How do black holes form?",
  "Why is the sky blue?",
  "How do vaccines work?",
  "What would happen if the Moon disappeared?",
];

/** The hero composer: type a question, pick a format, generate. Signed-out users go through
 *  login and land on /new with the topic filled in (proxy keeps ?next=). */
export function LandingPrompt({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<"short" | "full">("short");
  const [hint, setHint] = useState(0);

  useEffect(() => {
    if (topic) return;
    const t = setInterval(() => setHint((h) => (h + 1) % EXAMPLES.length), 3200);
    return () => clearInterval(t);
  }, [topic]);

  function go(text = topic) {
    const q = text.trim() || EXAMPLES[hint];
    router.push(`/new?topic=${encodeURIComponent(q)}&format=${format}`);
  }

  return (
    <div className="w-full">
      <form onSubmit={(e) => { e.preventDefault(); go(); }}
        className="rounded-[24px] border border-line-strong bg-surface p-2 text-left shadow-[0_1px_2px_rgb(24_24_27/0.04),0_20px_50px_-20px_rgb(24_24_27/0.25)] transition-shadow focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent-soft">
        <label htmlFor={compact ? "prompt-2" : "prompt"} className="sr-only">What should the video explain?</label>
        <textarea id={compact ? "prompt-2" : "prompt"} rows={compact ? 2 : 3} value={topic} onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); } }}
          placeholder={EXAMPLES[hint]} maxLength={300}
          className="block w-full resize-none bg-transparent px-4 pt-3 text-[18px] leading-relaxed placeholder:text-muted/70 focus:outline-none focus-visible:outline-none" />
        <div className="flex items-center justify-between gap-3 px-2 pt-1 pb-1">
          <div role="radiogroup" aria-label="Format" className="flex gap-1">
            {([["short", "Short", "9:16", DeviceMobile], ["full", "Full", "16:9", Monitor]] as const).map(([v, label, ratio, Icon]) => (
              <button key={v} type="button" role="radio" aria-checked={format === v} onClick={() => setFormat(v)}
                className={`press inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium whitespace-nowrap ${format === v ? "bg-fg text-bg" : "text-muted hover:bg-surface-2 hover:text-fg"}`}>
                <Icon size={14} aria-hidden /> {label}<span className="max-sm:hidden"> {ratio}</span>
              </button>
            ))}
          </div>
          <button type="submit" className="press inline-flex h-10 items-center gap-1.5 rounded-full bg-accent pr-4 pl-3.5 text-[15px] font-medium text-on-accent hover:bg-accent-hover">
            <Sparkle size={16} weight="fill" aria-hidden /> Generate
            <ArrowUp size={15} weight="bold" className="ml-0.5 hidden sm:block" aria-hidden />
          </button>
        </div>
      </form>
      {!compact && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[13px] text-muted">Try</span>
          {EXAMPLES.slice(1, 4).map((e) => (
            <button key={e} type="button" onClick={() => { setTopic(e); go(e); }}
              className="press rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[13px] text-muted hover:border-fg/30 hover:text-fg">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
