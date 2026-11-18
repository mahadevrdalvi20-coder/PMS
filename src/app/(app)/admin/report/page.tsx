import Link from "next/link";
import { getSupabase } from "@/lib/supabase/server";
import { getCycles } from "@/lib/data";
import { buildCycleReport, summarise } from "@/lib/report";
import { Card, CardHeader, EmptyState, Icon, PageHeader, ProgressBar, StatCard, buttonClass } from "@/components/ui";
import { CycleStatusBadge, GoalStageBadge, RatingPill, ReviewStatusBadge } from "@/components/status";
import { RATING_SCALE, REVIEW_STATUS_LABEL, REVIEW_STEPS } from "@/lib/format";
import type { ReviewStatus } from "@/lib/types";

export const metadata = { title: "Completion report" };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ cycle?: string; status?: string; dept?: string }> }) {
  const { cycle: cycleParam, status: statusFilter = "", dept = "" } = await searchParams;
  const supabase = await getSupabase();
  const cycles = (await getCycles(supabase)).filter((c) => c.status !== "draft");
  const cycle = cycles.find((c) => c.id === cycleParam) ?? cycles.find((c) => c.status === "open") ?? cycles[0];

  if (!cycle) {
    return (
      <>
        <PageHeader eyebrow="HR Admin" title="Completion report" />
        <Card>
          <EmptyState icon={<Icon name="chart" />} title="No cycles to report on" action={<Link href="/admin/cycles" className={buttonClass()}>Manage cycles</Link>}>
            Open a review cycle to start tracking completion.
          </EmptyState>
        </Card>
      </>
    );
  }

  const rows = await buildCycleReport(supabase, cycle.id);
  const s = summarise(rows);
  const departments = Array.from(new Set(rows.map((r) => r.employee.department).filter(Boolean) as string[])).sort();
  const filtered = rows.filter((r) => (!statusFilter || r.status === statusFilter) && (!dept || r.employee.department === dept));

  const byDept = departments.map((d) => {
    const inDept = rows.filter((r) => r.employee.department === d);
    const done = inDept.filter((r) => r.status === "completed").length;
    return { d, total: inDept.length, done };
  });

  const finalRatings = rows.filter((r) => r.status === "completed" && r.review?.overall_manager_rating);
  const distribution = RATING_SCALE.map((scale) => ({
    ...scale,
    count: finalRatings.filter((r) => r.review!.overall_manager_rating === scale.value).length,
  }));
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  const qs = new URLSearchParams({ cycle: cycle.id, ...(statusFilter && { status: statusFilter }), ...(dept && { dept }) });

  return (
    <>
      <PageHeader
        eyebrow="HR Admin"
        title="Completion report"
        description="Who has — and hasn't — completed each stage of the cycle."
        actions={
          <a href={`/admin/report/export?${qs}`} className={buttonClass("secondary")}>
            <Icon name="download" className="size-4" /> Export CSV
          </a>
        }
      />

      <Card className="mb-6 p-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select name="cycle" defaultValue={cycle.id} className="input sm:max-w-64" aria-label="Cycle">
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status})
              </option>
            ))}
          </select>
          <select name="status" defaultValue={statusFilter} className="input sm:max-w-56" aria-label="Review status">
            <option value="">All review statuses</option>
            {REVIEW_STEPS.map((st) => (
              <option key={st} value={st}>
                {REVIEW_STATUS_LABEL[st]}
              </option>
            ))}
          </select>
          <select name="dept" defaultValue={dept} className="input sm:max-w-48" aria-label="Department">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <button className={buttonClass("secondary")}>Apply</button>
          <span className="sm:ml-auto">
            <CycleStatusBadge status={cycle.status} />
          </span>
        </form>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Completion" value={`${s.completionPct}%`} sub={`${s.completed} of ${s.total} employees`} tone="emerald" />
        <StatCard label="Goals approved" value={s.goalsApproved} sub={`${s.goalsPending} awaiting manager approval`} tone="brand" />
        <StatCard label="Self-appraisal pending" value={s.notStarted} sub="Not started" tone="amber" />
        <StatCard label="With managers" value={s.selfSubmitted + s.managerReviewed} sub={`${s.selfSubmitted} to review · ${s.managerReviewed} to complete`} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="By department" />
          <ul className="space-y-4 p-5">
            {byDept.length === 0 && <li className="text-sm text-slate-500">No departments recorded.</li>}
            {byDept.map(({ d, total, done }) => (
              <li key={d}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{d}</span>
                  <span className="text-slate-500 tabular-nums">
                    {done}/{total} completed
                  </span>
                </div>
                <ProgressBar value={done} max={total} tone="emerald" />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Final rating distribution" description={`${finalRatings.length} completed review${finalRatings.length === 1 ? "" : "s"}. For information only — no forced curve.`} />
          <ul className="space-y-3 p-5">
            {distribution.map((d) => (
              <li key={d.value} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-sm">
                <span className="truncate text-slate-600">
                  <span className="font-semibold text-slate-900">{d.value}</span> · {d.label}
                </span>
                <div className="h-5 overflow-hidden rounded bg-slate-100">
                  <div className="h-full rounded bg-brand-500" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                </div>
                <span className="text-right font-semibold text-slate-700 tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title={`Employees (${filtered.length})`} />
        {filtered.length === 0 ? (
          <EmptyState title="No employees match these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="hidden px-4 py-3 md:table-cell">Manager</th>
                  <th className="px-4 py-3">Goals</th>
                  <th className="px-4 py-3">Review</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Self</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.employee.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/team/${r.employee.id}?cycle=${cycle.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                        {r.employee.full_name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {r.employee.designation ?? "—"} · {r.employee.department ?? "—"}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{r.manager?.full_name ?? <span className="text-amber-700">None</span>}</td>
                    <td className="px-4 py-3">
                      <GoalStageBadge stage={r.stage} />
                      {r.goalCount > 0 && <div className="mt-1 text-xs text-slate-400">{r.goalCount} · {r.weight}%</div>}
                    </td>
                    <td className="px-4 py-3">
                      <ReviewStatusBadge status={r.status as ReviewStatus} />
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <RatingPill value={r.review?.status !== "not_started" ? r.review?.overall_self_rating : null} />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <RatingPill value={r.review?.overall_manager_rating} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
