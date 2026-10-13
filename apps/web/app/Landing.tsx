import { STYLE_PRESETS } from "@lumen/core";
import {
  ArrowCounterClockwise, Books, Check, FilmSlate, MagicWand, Microphone, Receipt, Sparkle, SquaresFour,
} from "@phosphor-icons/react/dist/ssr";
import { BrandMark } from "@/components/BrandMark";
import { BRAND, BRAND_SLUG } from "@/lib/brand";
import { LandingPrompt } from "./LandingPrompt";

// Signed-out home: an AI explainer-video generator, light mode, clean.
// Every image, scene line and timing below comes from one real video made with this app
// (scripts/export-showcase.ts; narration and timings from the scenes table).

const DEMO = {
  prompt: "What if you never slept again?",
  style: "Paper Cut-out",
  seconds: 31.6,
  scenes: [
    { t: "0:00", text: "In animals, going without sleep kills, and the cause may be the gut." },
    { t: "0:05", text: "Randy Gardner, seventeen, stayed awake 264 hours." },
    { t: "0:09", text: "By day five, he saw a forest that wasn't there." },
    { t: "0:13", text: "On day ten, he beat his Stanford researcher at pinball." },
    { t: "0:16", text: "In 2020, Harvard researchers found that flies' deaths" },
    { t: "0:19", text: "always followed a gut buildup of reactive oxygen molecules." },
    { t: "0:23", text: "Flies given antioxidants lived normal lifespans." },
    { t: "0:26", text: "Mice showed the effect too." },
    { t: "0:28", text: "The mind unravels loudly." },
    { t: "0:29", text: "The gut may fail quietly." },
  ],
};

const STEPS = [
  { icon: Books, title: "Research and script", body: "Reads trusted sources, writes narration for the ear, and lists every fact with its link." },
  { icon: SquaresFour, title: "Storyboard", body: "Splits the script into scenes with visuals and camera moves. Edit anything before you pay." },
  { icon: Microphone, title: "Voice, motion, music", body: "Narration, animated scenes, a music bed and word-by-word captions, all in your chosen style." },
  { icon: FilmSlate, title: "Your video", body: "A finished MP4 for Shorts, Reels, TikTok or YouTube. Redo any scene on its own." },
];

export function Landing() {
  return (
    <main className="overflow-x-clip">
      {/* Hero: the generator itself */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(199_58_40/0.07),transparent_70%)]" />
        <div className="mx-auto max-w-3xl px-4 pt-14 text-center sm:px-6 sm:pt-20">
          <p className="enter inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1 text-[13px] font-medium text-muted">
            <Sparkle size={13} weight="fill" className="text-accent" aria-hidden /> AI explainer video generator
          </p>
          <h1 className="enter mt-5 text-[clamp(2.4rem,6vw,4.25rem)] leading-[1.04] font-semibold tracking-[-0.04em] text-balance" style={{ animationDelay: "40ms" }}>
            Turn any question into an explainer video.
          </h1>
          <p className="enter mx-auto mt-4 max-w-[46ch] text-[18px] leading-snug text-balance text-muted" style={{ animationDelay: "80ms" }}>
            Researched script, illustrated scenes, voice, motion, music and captions. You approve each step and see the price first.
          </p>
          <div className="enter mx-auto mt-8 max-w-2xl" style={{ animationDelay: "120ms" }}>
            <LandingPrompt />
          </div>
        </div>
      </section>

      {/* One real generation: prompt -> storyboard -> video */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:mt-24 sm:px-6">
        <div className="rounded-[28px] border border-line bg-surface-2/70 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-[14px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.06)]">
              <MagicWand size={15} className="text-accent" aria-hidden /> {DEMO.prompt}
            </span>
            <span className="text-[13px] text-muted">Short 9:16, {DEMO.style}, {DEMO.scenes.length} scenes, {DEMO.seconds} sec</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[rgb(22_163_74/0.1)] px-2.5 py-1 text-[12px] font-medium text-[#15803d]">
              <Check size={12} weight="bold" aria-hidden /> Ready
            </span>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <p className="mb-3 text-[13px] font-medium text-muted">Storyboard</p>
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {DEMO.scenes.map((s, i) => (
                  <li key={i} className="min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/showcase/scene-${i + 1}.jpg`} alt="" loading="lazy" className="aspect-[9/16] w-full rounded-[10px] object-cover ring-1 ring-line" />
                    <p className="mt-1.5 text-[11px] font-medium text-muted tabular-nums">Scene {i + 1} · {s.t}</p>
                    <p className="line-clamp-2 text-[12px] leading-snug">{s.text}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="mb-3 text-[13px] font-medium text-muted">Final video</p>
              <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[18px] bg-black shadow-float">
                <video src="/showcase/video.mp4" poster="/showcase/poster.jpg" autoPlay muted loop playsInline controls preload="metadata"
                  aria-label={`Example video made with ${BRAND}: ${DEMO.prompt}`} className="block aspect-[9/16] w-full object-cover" />
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[13px] text-muted">A real generation. Nothing on this page is a mock-up.</p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
        <h2 className="text-center text-[clamp(1.9rem,4vw,2.75rem)] leading-[1.1] font-semibold tracking-[-0.035em]">From one question to a finished video</h2>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-[22px] border border-line bg-surface p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"><s.icon size={20} aria-hidden /></span>
                <span className="text-[13px] font-medium text-muted tabular-nums">{i + 1}</span>
              </div>
              <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.01em]">{s.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Styles */}
      <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[clamp(1.9rem,4vw,2.75rem)] leading-[1.1] font-semibold tracking-[-0.035em]">Pick a look</h2>
            <p className="mt-2 max-w-[48ch] text-muted">Every scene keeps the same style and the same characters, from the first frame to the last.</p>
          </div>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STYLE_PRESETS.map((p) => (
            <li key={p.key} className="rounded-[18px] border border-line bg-surface p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/styles/${p.key}.jpg`} alt={`${p.name} style sample`} loading="lazy" className="aspect-[4/5] w-full rounded-[12px] object-cover" />
              <p className="mt-3 text-[14px] font-semibold">{p.name}</p>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">{p.blurb.replace(/\s*[—–]\s*(\w)/g, (_, c: string) => `. ${c.toUpperCase()}`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Why it's different */}
      <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
        <h2 className="text-[clamp(1.9rem,4vw,2.75rem)] leading-[1.1] font-semibold tracking-[-0.035em]">Built to be trusted</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[22px] border border-line bg-surface p-6 lg:row-span-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"><Receipt size={20} aria-hidden /></span>
            <h3 className="mt-5 text-[17px] font-semibold">The price before you press generate</h3>
            <p className="mt-1.5 text-[14px] text-muted">Credits are held, charged per finished step, and anything unused comes back.</p>
            <dl className="mt-6 space-y-2.5 rounded-[14px] bg-surface-2 p-4 text-[14px]">
              {[["Style and keyframes", 50], ["Motion, 10 scenes", 260], ["Voice timing and music", 5], ["Retry buffer", 47]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="tabular-nums">{v}</dd></div>
              ))}
              <div className="flex justify-between gap-4 border-t border-line-strong pt-2.5 font-semibold"><dt>Held</dt><dd className="tabular-nums">362 credits</dd></div>
            </dl>
            <p className="mt-2 text-[12px] text-muted">Example estimate for a 30 second Short.</p>
          </div>
          <div className="rounded-[22px] border border-line bg-surface p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"><Books size={20} aria-hidden /></span>
            <h3 className="mt-5 text-[17px] font-semibold">Every fact, sourced</h3>
            <p className="mt-1.5 text-[14px] text-muted">Each claim in the script links to the page it came from, so you can check it before anything is made.</p>
          </div>
          <div className="rounded-[22px] border border-line bg-surface p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"><ArrowCounterClockwise size={20} aria-hidden /></span>
            <h3 className="mt-5 text-[17px] font-semibold">Redo one scene, keep the rest</h3>
            <p className="mt-1.5 text-[14px] text-muted">Not quite right? Regenerate a single scene without paying for the whole video again.</p>
          </div>
          <div className="rounded-[22px] border border-line bg-surface p-6 lg:col-span-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"><FilmSlate size={20} aria-hidden /></span>
            <h3 className="mt-5 text-[17px] font-semibold">Short and Full formats</h3>
            <p className="mt-1.5 text-[14px] text-muted">9:16 for Shorts, Reels and TikTok. 16:9 for YouTube, with chapters for longer stories.</p>
          </div>
        </div>
      </section>

      {/* Closing prompt */}
      <section className="mx-auto max-w-3xl px-4 py-28 text-center sm:px-6">
        <BrandMark size={40} className="mx-auto text-accent" />
        <h2 className="mt-5 text-[clamp(2rem,4.5vw,3rem)] leading-[1.08] font-semibold tracking-[-0.035em]">What should we explain?</h2>
        <div className="mx-auto mt-8 max-w-2xl"><LandingPrompt compact /></div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-muted sm:px-6">
          <span className="inline-flex items-center gap-1.5"><BrandMark size={14} /> {BRAND_SLUG}</span>
          <span>AI explainer videos from a topic or a script.</span>
        </div>
      </footer>
    </main>
  );
}
