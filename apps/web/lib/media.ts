"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

/** Presigned R2 URLs for asset ids, requested in one batch per new set of ids. Cached for the session. */
export function useSignedUrls(supabase: SupabaseClient, ids: (string | null | undefined)[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());
  const key = ids.filter(Boolean).join(",");

  const fetchMissing = useCallback(async (want: string[]) => {
    const missing = want.filter((id) => !requested.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => requested.current.add(id));
    const { data } = await supabase.functions.invoke<{ urls: Record<string, string> }>("sign-url", { body: { asset_ids: missing } });
    if (data?.urls) setUrls((u) => ({ ...u, ...data.urls }));
    else missing.forEach((id) => requested.current.delete(id)); // allow a retry on the next render
  }, [supabase]);

  useEffect(() => {
    if (key) void fetchMissing(key.split(","));
  }, [key, fetchMissing]);

  return urls;
}
