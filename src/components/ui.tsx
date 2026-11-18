import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Small presentational building blocks shared by every screen.

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md";

export function buttonClass(variant: Variant = "primary", size: Size = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap",
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
    variant === "primary" && "bg-brand-700 text-white shadow-sm hover:bg-brand-800",
    variant === "secondary" && "border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50",
    variant === "danger" && "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    variant === "ghost" && "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    variant === "success" && "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={cn(buttonClass(variant, size), className)} />;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-semibold tracking-wider text-brand-700 uppercase">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border border-slate-200 bg-white shadow-xs", className)}>{children}</div>;
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        {icon ?? <Icon name="inbox" />}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-slate-600">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "error";
  title?: ReactNode;
  children?: ReactNode;
}) {
  const styles = {
    info: "border-brand-200 bg-brand-50 text-brand-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-900",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm", styles)}>
      {title && <div className="font-semibold">{title}</div>}
      {children && <div className={cn(!!title && "mt-0.5", "opacity-90")}>{children}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, tone = "slate" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "slate" | "brand" | "emerald" | "amber" }) {
  const accent = { slate: "text-slate-900", brand: "text-brand-700", emerald: "text-emerald-700", amber: "text-amber-700" }[tone];
  return (
    <Card className="p-5">
      <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</div>
      <div className={cn("mt-2 text-3xl font-bold tabular-nums", accent)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

export function ProgressBar({ value, max = 100, tone = "brand" }: { value: number; max?: number; tone?: "brand" | "emerald" | "amber" | "red" }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const bar = { brand: "bg-brand-600", emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800",
        size === "sm" && "size-7 text-[11px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-14 text-lg",
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-xs font-medium text-slate-500">{i.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-900">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Icons (inline SVG, no dependency)
// ---------------------------------------------------------------------------
const PATHS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  clipboard: "M9 4h6m-6 0a1 1 0 0 0-1 1v1h8V5a1 1 0 0 0-1-1M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M9 13l2 2 4-4",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2",
  users: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1m20 0v-1a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  building: "M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16m0 0h4V11a2 2 0 0 0-2-2h-2M4 21h12M8 7h4m-4 4h4m-4 4h4",
  calendar: "M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  inbox: "M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l2-8Z",
  check: "m5 12 5 5L20 7",
  x: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  download: "M12 4v12m0 0-5-5m5 5 5-5M4 20h16",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z",
  mail: "M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm0 1 8 6 8-6",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z",
  edit: "M4 20h4L19 9l-4-4L4 16v4Zm10-14 4 4",
  trash: "M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3",
  send: "M4 12 20 4l-6 16-3-7-7-1Z",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
  activity: "M3 12h4l3-8 4 16 3-8h4",
};

export function Icon({ name, className = "size-5" }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name] ?? PATHS.inbox} />
    </svg>
  );
}
