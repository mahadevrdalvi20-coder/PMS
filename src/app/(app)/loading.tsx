export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="h-7 w-64 rounded bg-slate-200" />
      </div>
      <div className="h-28 rounded-xl bg-slate-200/70" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56 rounded-xl bg-slate-200/70" />
        <div className="h-56 rounded-xl bg-slate-200/70" />
      </div>
    </div>
  );
}
