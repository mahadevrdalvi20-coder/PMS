import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ButtonLink, Icon } from "@/components/ui";

const FEATURES = [
  {
    icon: "target",
    title: "Goals that add up",
    body: "Employees set weighted goals against the open cycle. Weightage must total 100 before anything goes to the manager.",
  },
  {
    icon: "clipboard",
    title: "Side-by-side reviews",
    body: "Managers see the self-appraisal next to their own rating for every goal, then give an overall rating and summary.",
  },
  {
    icon: "chart",
    title: "Completion at a glance",
    body: "HR opens and closes cycles, manages the reporting hierarchy and tracks who has — and hasn't — submitted.",
  },
];

const STEPS = ["Goals set", "Goals approved", "Self-appraisal", "Manager review", "Completed"];

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-700 text-white">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 17 9 12l4 4 7-8" />
              <path d="M15 8h5v5" />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight">Stride</span>
        </Link>
        {userId ? (
          <ButtonLink href="/dashboard" size="sm">
            Open dashboard
          </ButtonLink>
        ) : (
          <ButtonLink href="/sign-in" size="sm" variant="secondary">
            Sign in
          </ButtonLink>
        )}
      </header>

      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--color-brand-100),transparent)]" />
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-800">
            <Icon name="shield" className="size-3.5" /> Performance management for growing teams
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-6xl">
            Run your appraisal cycle end to end — <span className="text-brand-700">not in spreadsheets.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-slate-600">
            Stride replaces e-mailed forms and Excel sheets with one auditable record of what every employee was asked to achieve, and what they actually
            achieved.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href={userId ? "/dashboard" : "/sign-in"} className="w-full px-6 py-3 text-base sm:w-auto">
              {userId ? "Go to your dashboard" : "Sign in"} <Icon name="arrow" className="size-4" />
            </ButtonLink>
          </div>

          <ol className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 shadow-xs ring-1 ring-slate-200">
                  <span className="flex size-5 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">{i + 1}</span>
                  {s}
                </span>
                {i < STEPS.length - 1 && <Icon name="arrow" className="hidden size-4 text-slate-300 sm:block" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-slate-200 p-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Icon name={f.icon} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-500">
        Stride PMS · Built with Next.js, Clerk, Supabase and Resend
      </footer>
    </div>
  );
}
