import Link from "next/link";

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-700 text-white">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 17 9 12l4 4 7-8" />
            <path d="M15 8h5v5" />
          </svg>
        </span>
        <span className="text-xl font-bold tracking-tight text-slate-900">Stride</span>
      </Link>
      {children}
      <p className="mt-6 max-w-sm text-center text-xs text-slate-500">
        Use the work e-mail HR registered for you. Your account is linked to your employee record on first sign-in.
      </p>
    </div>
  );
}
