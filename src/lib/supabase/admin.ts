import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. BYPASSES Row Level Security, so it is used in exactly
 * one place: linking a brand-new Clerk login to its employee row on first
 * sign-in (at that moment the user has no employee identity yet, so RLS would
 * hide the row they need to claim).
 *
 * `server-only` makes the build fail if this file is ever imported into code
 * that runs in the browser, so the key can never leak.
 */
export function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
