import { ArrowRight, Check, DeviceMobile, Monitor } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { btn } from "@/components/styles";

// Signed-out home. Hero media is a real Lumen render (scripts/export-showcase.ts), not a mock-up.

const STEPS = [
  { name: "Script", body: "Lumen researches the topic, writes narration and lists every fact with its source. Edit anything." },
  { name: "Storyboard", body: "Each line becomes a scene. Choose which scenes move. The price updates as you go." },
  { name: "Generate", body: "Voice, images, motion, music and captions, assembled into one video you can download." },
  { name: "Redo a scene", body: "Not quite right? Regenerate one scene without paying for the rest again." },
];

export function Landing() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-20 lg:gap-20">
        <div className="enter">
          <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.04] font-semibold tracking-[-0.032em]">
            Explainer videos from a single sentence.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-muted">
            Type a topic. Lumen writes the script, draws every scene and narrates it, and you approve each step.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link href="/login" className={btn("primary", "lg")}>Sign in <ArrowRight size={17} weight="bold" aria-hidden /></Link>
          </div>
        </div>
        <div className="enter flex justify-center md:justify-end" style={{ animationDelay: "80ms" }}>
          <div className="relative w-[min(78vw,300px)] rounded-[34px] bg-[#111114] p-2.5 shadow-[0_30px_80px_-20px_rgb(20_20_30/0.45)]">
            <video src="/showcase/video.mp4" poster="/showcase/poster.jpg" autoPlay muted loop playsInline preload="metadata"
              aria-label="Example video made with Lumen: What if you never slept again?"
              className="aspect-[9/16] w-full rounded-[26px] bg-black object-cover" />
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="display max-w-[22ch]">You stay in charge of every step.</h2>
          <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.name} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent tabular-nums">{i + 1}</span>
                <div>
                  <h3 className="title">{s.name}</h3>
                  <p className="mt-1 max-w-[44ch] text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-14 -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" aria-label="Scenes from the example video">
            {Array.from({ length: 10 }, (_, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={`/showcase/scene-${i + 1}.jpg`} alt="" loading="lazy"
                className="aspect-[9/16] w-[108px] shrink-0 rounded-[10px] object-cover ring-1 ring-line sm:w-[calc((100%-108px)/10)]" />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
        <div>
          <h2 className="display">The price, before you press generate.</h2>
          <p className="mt-4 max-w-[46ch] text-muted">
            Every video shows its cost line by line before anything is made. Credits are held, charged per finished step,
            and anything unused comes straight back.
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-float">
          <p className="text-[13px] font-medium text-muted">Example: 30 second Short, 10 scenes</p>
          <dl className="mt-4 space-y-2.5 text-[15px]">
            {[["Style frame and keyframes", 50], ["Motion for 10 scenes", 260], ["Voice timing and music", 5], ["Retry buffer", 47]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="tabular-nums">{v}</dd></div>
            ))}
            <div className="flex justify-between gap-4 border-t border-line pt-3 font-semibold"><dt>Held now</dt><dd className="tabular-nums">362 credits</dd></div>
          </dl>
          <p className="mt-4 flex items-center gap-2 text-[13px] text-muted"><Check size={15} weight="bold" className="text-accent" aria-hidden /> Unused credits are returned when the video is done.</p>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2 sm:px-6">
          {[
            { icon: DeviceMobile, name: "Short", meta: "9:16", body: "For Shorts, Reels and TikTok. Up to 60 seconds." },
            { icon: Monitor, name: "Full", meta: "16:9", body: "For YouTube. Chapters, longer stories, up to 10 minutes." },
          ].map((f) => (
            <div key={f.name} className="flex gap-4 rounded-[var(--radius-card)] bg-surface-2 p-6">
              <f.icon size={26} className="shrink-0 text-accent" aria-hidden />
              <div>
                <h3 className="title">{f.name} <span className="ml-1 text-[13px] font-medium text-muted">{f.meta}</span></h3>
                <p className="mt-1 text-muted">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
