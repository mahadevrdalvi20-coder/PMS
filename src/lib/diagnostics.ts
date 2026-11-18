import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Live self-test for /setup. Each check returns ✓ / ✗ and, when it fails, the
 * exact fix. Results never include key values or employee data.
 */
export interface Check {
  label: string;
  ok: boolean;
  fix?: string;
}

const TIMEOUT_MS = 5000;

function withTimeout<T>(p: PromiseLike<T>): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), TIMEOUT_MS)),
  ]);
}

export async function runDiagnostics(): Promise<Check[]> {
  const checks: Check[] = [];
  const env = process.env;

  // ---- Clerk ---------------------------------------------------------------
  const pk = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const sk = env.CLERK_SECRET_KEY ?? "";
  if (pk && sk) {
    const pkOk = /^pk_(test|live)_/.test(pk);
    const skOk = /^sk_(test|live)_/.test(sk);
    checks.push({
      label: "Clerk keys have the right format",
      ok: pkOk && skOk,
      fix: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_ and CLERK_SECRET_KEY with sk_. Copy both from Clerk → API Keys (no quotes or spaces).",
    });
    if (pkOk && skOk) {
      const same = pk.split("_")[1] === sk.split("_")[1];
      checks.push({
        label: "Clerk keys come from the same instance",
        ok: same,
        fix: "One key is a test key and the other a live key. Copy both from the same Clerk instance (Development → pk_test_/sk_test_).",
      });
    }
  }

  // ---- Supabase ------------------------------------------------------------
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (url) {
    const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url.trim());
    checks.push({
      label: "Supabase URL looks right",
      ok: urlOk,
      fix: "Use the Project URL from Supabase → Project Settings → API, e.g. https://abcd1234.supabase.co (no /rest/v1 at the end).",
    });
  }

  if (url && anon) {
    try {
      const sb = createClient(url, anon, { auth: { persistSession: false } });
      const { error } = await withTimeout(sb.from("review_cycles").select("id", { head: true, count: "exact" }));
      const bad = error && /api key|jwt|apikey|401|unauthor/i.test(`${error.message} ${error.code}`);
      checks.push({
        label: "Supabase anon / publishable key is accepted",
        ok: !bad,
        fix: "NEXT_PUBLIC_SUPABASE_ANON_KEY is wrong or from another project. Copy the anon (or publishable) key from the same project as the URL.",
      });
    } catch {
      checks.push({ label: "Supabase is reachable", ok: false, fix: "The Supabase project could not be reached. Check the URL and that the project is not paused (free projects pause after a week of inactivity)." });
    }
  }

  if (url && service) {
    try {
      const admin = createClient(url, service, { auth: { persistSession: false } });
      const { error } = await withTimeout(admin.from("employees").select("id", { head: true, count: "exact" }));
      const keyBad = error && /api key|jwt|apikey|401|unauthor/i.test(`${error.message} ${error.code}`);
      const tableMissing = error && /does not exist|schema cache|42P01|PGRST205/i.test(`${error.message} ${error.code}`);
      checks.push({
        label: "Supabase service_role key is accepted",
        ok: !keyBad,
        fix: "SUPABASE_SERVICE_ROLE_KEY is wrong or from another project. Copy the service_role (secret) key from Project Settings → API.",
      });
      if (!keyBad) {
        checks.push({
          label: "Database tables exist (schema.sql has been run)",
          ok: !tableMissing && !error,
          fix: tableMissing
            ? "Open Supabase → SQL Editor, paste the whole of supabase/schema.sql from the repository and click Run."
            : `Supabase returned: ${error?.message ?? "unknown error"}`,
        });
        if (!error) {
          const { count } = await withTimeout(
            admin.from("employees").select("id", { head: true, count: "exact" }).eq("role", "hr_admin").eq("is_active", true),
          );
          checks.push({
            label: "At least one active HR admin exists",
            ok: (count ?? 0) > 0,
            fix: "Edit supabase/seed.sql: replace hr.admin@example.com with YOUR e-mail, then run it in the SQL Editor. Sign in with that e-mail.",
          });
          const { error: fnError } = await withTimeout(admin.rpc("is_service"));
          checks.push({
            label: "Security functions and policies are installed",
            ok: !fnError,
            fix: "Re-run the whole of supabase/schema.sql in the SQL Editor (it is safe to run more than once).",
          });
        }
      }
    } catch {
      checks.push({ label: "Supabase is reachable with the service_role key", ok: false, fix: "The Supabase project could not be reached. Check the URL and that the project is not paused." });
    }
  }

  // ---- E-mail --------------------------------------------------------------
  if (env.RESEND_API_KEY) {
    checks.push({
      label: "Resend API key has the right format",
      ok: env.RESEND_API_KEY.startsWith("re_"),
      fix: "RESEND_API_KEY must start with re_. Create one at resend.com → API Keys.",
    });
  }

  return checks;
}
