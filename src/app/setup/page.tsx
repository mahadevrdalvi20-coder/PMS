import { OPTIONAL_ENV, REQUIRED_ENV, missingEnv } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Setup required" };

const ISSUES: Record<string, { title: string; steps: string[] }> = {
  "supabase-auth": {
    title: "Supabase rejected the signed-in user's token",
    steps: [
      "In Clerk: Integrations → Supabase (dashboard.clerk.com/setup/supabase) → activate, and copy the Clerk domain.",
      "In Supabase: Authentication → Sign In / Providers → Third-Party Auth → Add provider → Clerk → paste the domain.",
      "Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY belong to the same Supabase project, then redeploy.",
    ],
  },
  "supabase-schema": {
    title: "The database tables do not exist yet",
    steps: [
      "Supabase → SQL Editor → paste and run supabase/schema.sql from the repository.",
      "Edit the e-mails in supabase/seed.sql to your own, and run it (you need at least one hr_admin).",
    ],
  },
  "supabase-other": {
    title: "Supabase returned an error",
    steps: ["Check the Supabase URL and keys in your environment variables, then redeploy."],
  },
};

/**
 * Shown instead of a 500 error when the deployment is not configured.
 * Lists only the NAMES of missing variables — never any values.
 */
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ issue?: string; detail?: string }> }) {
  const { issue, detail } = await searchParams;
  const missing = missingEnv();
  const missingOptional = missingEnv(OPTIONAL_ENV);
  const problem = issue ? ISSUES[issue] : undefined;
  const ok = missing.length === 0 && !problem;

  return (
    <div className="flex min-h-dvh items-start justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-xs font-semibold tracking-wider text-brand-700 uppercase">Stride PMS</div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{ok ? "Configuration looks good" : "Setup required"}</h1>

        {missing.length > 0 && (
          <>
            <p className="mt-3 text-sm text-slate-600">
              The app is deployed but these environment variables are not set, so it cannot start. In Vercel open{" "}
              <strong>Project → Settings → Environment Variables</strong>, add them, then go to <strong>Deployments → ⋯ → Redeploy</strong>{" "}
              (variables only apply to a new build).
            </p>
            <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {REQUIRED_ENV.map((v) => {
                const isMissing = missing.includes(v.name);
                return (
                  <li key={v.name} className="flex items-start gap-3 px-4 py-3 text-sm">
                    <span className={`mt-0.5 font-bold ${isMissing ? "text-red-600" : "text-emerald-600"}`}>{isMissing ? "✗" : "✓"}</span>
                    <div>
                      <code className="font-mono font-semibold text-slate-900">{v.name}</code>
                      <div className="text-xs text-slate-500">{v.where}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {problem && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <div className="font-semibold">{problem.title}</div>
            {detail && <div className="mt-1 font-mono text-xs break-words opacity-80">{detail}</div>}
            <ol className="mt-3 list-decimal space-y-1 pl-5">
              {problem.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        )}

        {missingOptional.length > 0 && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-semibold">Optional, but recommended</div>
            <ul className="mt-1 list-disc pl-5">
              {OPTIONAL_ENV.filter((v) => missingOptional.includes(v.name)).map((v) => (
                <li key={v.name}>
                  <code className="font-mono">{v.name}</code> — {v.where}
                </li>
              ))}
            </ul>
          </div>
        )}

        {ok && (
          <p className="mt-3 text-sm text-slate-600">
            All required settings are present. <a href="/dashboard" className="font-semibold text-brand-700">Go to the dashboard →</a>
          </p>
        )}
      </div>
    </div>
  );
}
