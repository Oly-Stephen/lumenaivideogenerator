"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
import { Button, Field, inputCls } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { browserClient } from "@/lib/supabase";

/** Only same-site paths are allowed as a post-login destination (no open redirects). */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/";
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "info" } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = browserClient();
    const { error, data } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg({ text: error.message, tone: "error" });
    if (mode === "signup" && !data.session) return setMsg({ text: `We sent a confirmation link to ${email}. Open it, then sign in here.`, tone: "info" });
    router.push(next);
    router.refresh();
  }

  return (
    <main className="grid min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="enter w-full max-w-[380px]">
          <h1 className="text-[clamp(1.9rem,3.2vw,2.5rem)] leading-tight font-semibold tracking-[-0.035em]">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-[15px] text-muted">{mode === "signin" ? `Sign in to keep making videos with ${BRAND}.` : "Turn any question into a narrated, illustrated video."}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email" htmlFor="email">
              <input id="email" className={`${inputCls} h-11`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <Field label="Password" htmlFor="password" helper={mode === "signup" ? "At least 8 characters." : undefined}>
              <input id="password" className={`${inputCls} h-11`} type="password" required minLength={8} value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </Field>
            {msg && <p role={msg.tone === "error" ? "alert" : "status"} className={`text-sm ${msg.tone === "error" ? "text-danger" : "text-muted"}`}>{msg.text}</p>}
            <Button type="submit" size="lg" className="w-full" busy={busy}>{mode === "signin" ? "Sign in" : "Create account"}</Button>
          </form>
          <p className="mt-6 text-sm text-muted">
            {mode === "signin" ? `New to ${BRAND}? ` : "Already have an account? "}
            <button className="font-medium text-accent hover:underline" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}>
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* showcase: a real video made with the app */}
      <aside className="dots relative hidden overflow-hidden border-l border-line lg:flex lg:items-center lg:justify-center" aria-hidden>
        <div className="relative flex items-center gap-5">
          <div className="flex flex-col gap-3">
            {[2, 4, 6].map((n) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={n} src={`/showcase/scene-${n}.jpg`} alt="" className="h-[150px] w-[84px] rounded-[12px] object-cover shadow-float ring-1 ring-line" />
            ))}
          </div>
          <div className="w-[260px] overflow-hidden rounded-[22px] bg-black shadow-[0_30px_80px_-30px_rgb(24_24_27/0.5)]">
            <video src="/showcase/video.mp4" poster="/showcase/poster.jpg" autoPlay muted loop playsInline className="block aspect-[9/16] w-full object-cover" />
          </div>
          <div className="flex flex-col gap-3">
            {[3, 7, 9].map((n) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={n} src={`/showcase/scene-${n}.jpg`} alt="" className="h-[150px] w-[84px] rounded-[12px] object-cover shadow-float ring-1 ring-line" />
            ))}
          </div>
        </div>
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-surface px-3 py-1.5 text-[12px] text-muted shadow-sm ring-1 ring-line">
          &ldquo;What if you never slept again?&rdquo; made with {BRAND}
        </p>
      </aside>
    </main>
  );
}
