import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">
      <div className="text-sm font-semibold text-brand-700">404</div>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        This page doesn&apos;t exist, or you don&apos;t have permission to see it.
      </p>
      <Link href="/dashboard" className={`${buttonClass()} mt-6`}>
        Back to dashboard
      </Link>
    </div>
  );
}
