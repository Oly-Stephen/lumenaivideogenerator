"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputCls } from "@/components/ui";
import { browserClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
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
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="enter w-full max-w-[380px]">
        <h1 className="display text-center">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-2 text-center text-muted">{mode === "signin" ? "Sign in to your Lumen library." : "Start making explainer videos."}</p>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-[20px] border border-line bg-surface p-6 shadow-float">
          <Field label="Email" htmlFor="email">
            <input id="email" className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Password" htmlFor="password" helper={mode === "signup" ? "At least 8 characters." : undefined}>
            <input id="password" className={inputCls} type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </Field>
          {msg && <p role={msg.tone === "error" ? "alert" : "status"} className={`text-sm ${msg.tone === "error" ? "text-danger" : "text-muted"}`}>{msg.text}</p>}
          <Button type="submit" size="lg" className="w-full" busy={busy}>{mode === "signin" ? "Sign in" : "Create account"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {mode === "signin" ? "New to Lumen? " : "Already have an account? "}
          <button className="font-medium text-accent hover:underline" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
