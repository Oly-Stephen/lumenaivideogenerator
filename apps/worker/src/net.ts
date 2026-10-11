// fetch with retries for transient failures (DNS hiccups, resets, timeouts, 429/5xx).
// Non-idempotent POSTs (fal submit, Fish TTS) are retried only on errors raised *before* a response arrived
// (DNS/connect) unless `retryOnStatus` is set — so we never double-submit after the server accepted a request.

const TRANSIENT_CODES = new Set(["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET", "EPIPE"]);

export function isTransientNetworkError(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string }; name?: string; message?: string };
  const code = err?.cause?.code ?? err?.code;
  return (code !== undefined && TRANSIENT_CODES.has(code)) || err?.name === "AbortError" || /fetch failed/i.test(err?.message ?? "");
}

export interface RetryOpts {
  attempts?: number;
  baseMs?: number;
  retryOnStatus?: boolean; // retry 408/429/5xx responses (safe for GET/PUT-to-key)
  label?: string;
}

export async function fetchRetry(url: string | URL, init: RequestInit = {}, opts: RetryOpts = {}): Promise<Response> {
  const attempts = opts.attempts ?? 5;
  const base = opts.baseMs ?? 500;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(120_000) });
      const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
      if (opts.retryOnStatus && retryable && i < attempts - 1) {
        await res.body?.cancel();
        lastErr = new Error(`${opts.label ?? "request"} → HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (e) {
      if (!isTransientNetworkError(e) || i === attempts - 1) throw e;
      lastErr = e;
    }
    const delay = base * 2 ** i + Math.random() * base;
    console.warn(`[net] ${opts.label ?? "fetch"} transient failure, retry ${i + 1}/${attempts - 1} in ${Math.round(delay)}ms`);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw lastErr;
}
