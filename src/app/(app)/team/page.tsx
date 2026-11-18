import Link from "next/link";
import { getSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { getOpenCycle } from "@/lib/data";
import { Avatar, Card, EmptyState, Icon, PageHeader, StatCard } from "@/components/ui";
import { GoalStageBadge, RatingPill, ReviewStatusBadge } from "@/components/status";
import { goalStage, reviewStatusOf } from "@/lib/format";
import type { Employee, Goal, Review } from "@/lib/types";

export const metadata = { title: "My Team" };

export default async function TeamPage() {
  const me = await requireUser();
  const supabase = await getSupabase();

  const [{ data: reportsData }, cycle] = await Promise.all([
    supabase.from("employees").select("*").eq("manager_id", me.id).eq("is_active", true).order("full_name"),
    getOpenCycle(supabase),
  ]);
  const reports = (reportsData ?? []) as Employee[];
  const ids = reports.map((r) => r.id);

  let goals: Goal[] = [];
  let reviews: Review[] = [];
  if (cycle && ids.length) {
    const [g, r] = await Promise.all([
      supabase.from("goals").select("*").eq("cycle_id", cycle.id).in("employee_id", ids),
      supabase.from("reviews").select("*").eq("cycle_id", cycle.id).in("employee_id", ids),
    ]);
    goals = (g.data ?? []) as Goal[];
    reviews = (r.data ?? []) as Review[];
  }

  const rows = reports.map((e) => {
    const myGoals = goals.filter((g) => g.employee_id === e.id);
    const review = reviews.find((r) => r.employee_id === e.id) ?? null;
    const status = reviewStatusOf(review);
    const pendingGoals = myGoals.filter((g) => g.status === "submitted").length;
    const needsMe = pendingGoals > 0 || status === "self_submitted" || status === "manager_reviewed";
    return { e, stage: goalStage(myGoals), status, review, pendingGoals, needsMe };
  });

  const count = (s: string) => rows.filter((r) => r.status === s).length;

  return (
    <>
      <PageHeader
        eyebrow={cycle?.name ?? "Manager"}
        title="My Team"
        description={`${reports.length} direct report${reports.length === 1 ? "" : "s"}. Approve goals and complete reviews from here.`}
      />

      {reports.length === 0 ? (
        <Card>
          <EmptyState icon={<Icon name="users" />} title="No one reports to you yet">
            When HR sets you as someone&apos;s manager, they will appear here.
          </EmptyState>
        </Card>
      ) : (
        <>
          {cycle && (
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Need your action" value={rows.filter((r) => r.needsMe).length} tone="amber" />
              <StatCard label="Awaiting self-appraisal" value={count("not_started")} />
              <StatCard label="Ready to review" value={count("self_submitted")} tone="brand" />
              <StatCard label="Completed" value={`${count("completed")}/${rows.length}`} tone="emerald" />
            </div>
          )}

          <Card>
            <ul className="divide-y divide-slate-100">
              {rows.map(({ e, stage, status, review, pendingGoals, needsMe }) => (
                <li key={e.id}>
                  <Link href={`/team/${e.id}`} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={e.full_name} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-slate-900">{e.full_name}</span>
                          {needsMe && <span className="size-2 shrink-0 rounded-full bg-amber-500" title="Needs your action" />}
                        </div>
                        <div className="truncate text-xs text-slate-500">{e.designation ?? "—"}</div>
                      </div>
                    </div>
                    {cycle ? (
                      <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">
                        <span className="text-xs text-slate-400">Goals</span>
                        <GoalStageBadge stage={stage} />
                        {pendingGoals > 0 && <span className="text-xs font-semibold text-amber-700">{pendingGoals} to approve</span>}
                        <span className="text-xs text-slate-400 sm:ml-2">Review</span>
                        <ReviewStatusBadge status={status} />
                        {status === "completed" && <RatingPill value={review?.overall_manager_rating} />}
                      </div>
                    ) : (
                      <span className="pl-12 text-xs text-slate-400 sm:pl-0">No open cycle</span>
                    )}
                    <Icon name="arrow" className="hidden size-4 text-slate-300 sm:block" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
