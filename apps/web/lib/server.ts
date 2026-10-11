import { cookies } from "next/headers";
import { serverClient } from "./supabase";

export async function supabaseServer() {
  return serverClient(await cookies());
}

export async function requireUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}
