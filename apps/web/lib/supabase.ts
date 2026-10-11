import { createBrowserClient, createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function browserClient() {
  return createBrowserClient(url, anonKey);
}

/** Server components / actions: pass Next's cookie store (`await cookies()`). */
export function serverClient(cookieStore: {
  getAll(): { name: string; value: string }[];
  set?(name: string, value: string, options?: Record<string, unknown>): void;
}) {
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set?.(name, value, options));
        } catch {
          // called from a Server Component: cookies are read-only there; middleware refreshes the session
        }
      },
    },
  });
}
