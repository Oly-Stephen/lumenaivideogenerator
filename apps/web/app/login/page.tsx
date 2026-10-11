"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
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
    if (error) return setMsg(error.message);
    if (mode === "signup" && !data.session) return setMsg("Check your email to confirm your account, then sign in.");
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-2xl font-semibold">{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" type="email" required
          placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" type="password" required minLength={8}
          placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        <button disabled={busy} className="w-full rounded-md bg-[color:var(--accent)] px-3 py-2 font-medium text-white disabled:opacity-60">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      {msg && <p className="mt-3 text-sm text-[color:var(--muted)]">{msg}</p>}
      <button className="mt-6 text-sm underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
