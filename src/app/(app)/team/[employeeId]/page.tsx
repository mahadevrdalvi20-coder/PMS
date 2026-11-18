import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { getAppraisal, getCycle, getCycles, getEmployee } from "@/lib/data";
import { Alert, Avatar, Card, CardHeader, DescriptionList, EmptyState, Icon, PageHeader } from "@/components/ui";
import { CycleStatusBadge, GoalStageBadge, GoalStatusBadge, ReviewStatusBadge, ReviewStepper } from "@/components/status";
import { ActionButton } from "@/components/action-button";
import { ReviewView } from "@/components/review-view";
import { formatDate, formatDateTime, goalStage, reviewStatusOf, totalWeight } from "@/lib/format";
import { approveAllGoals, completeReview, reopenManagerReview } from "../actions";
import { GoalDecision } from "./goal-decision";
import { ManagerReviewForm } from "./manager-review-form";

export const metadata = { title: "Review employee" };

export default async function ReviewEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ cycle?: string }>;
}) {
  const [{ employeeId }, { cycle: cycleParam }] = await Promise.all([params, searchParams]);
  const me = await requireUser();
  const supabase = await getSupabase();

  const employee = await getEmployee(supabase, employeeId);
  // Only this person's current manager (or HR) may open this page. Anyone else
  // gets a 404 — we don't even confirm the employee exists. RLS would return
  // no goals or reviews for them anyway.
  if (!employee || (employee.manager_id !== me.id && !me.isHR) || employee.id === me.id) notFound();

  const cycles = await getCycles(supabase);
  const cycle = cycleParam ? await getCycle(supabase, cycleParam) : (cycles.find((c) => c.status === "open") ?? cycles.find((c) => c.status === "closed"));

  const header = (
    <PageHeader
      eyebrow={<Link href={me.isHR && employee.manager_id !== me.id ? "/admin/report" : "/team"} className="hover:underline">← {me.isHR && employee.manager_id !== me.id ? "Completion report" : "My Team"}</Link>}
      title={
        <span className="flex items-center gap-3">
          <Avatar name={employee.full_name} size="lg" />
          <span>
            {employee.full_name}
            <span className="block text-sm font-normal text-slate-500">
              {employee.designation ?? "—"} · {employee.department ?? "—"}
            </span>
          </span>
        </span>
      }
      actions={
        cycles.length > 1 ? (
          <form className="flex gap-2">
            <select name="cycle" defaultValue={cycle?.id} className="input w-auto" aria-label="Cycle">
              {cycles
                .filter((c) => c.status !== "draft")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <button className="rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">View</button>
          </form>
        ) : undefined
      }
    />
  );

  if (!cycle || cycle.status === "draft") {
    return (
      <>
        {header}
        <Card>
          <EmptyState icon={<Icon name="calendar" />} title="No review cycle to show">
            Once HR opens a cycle, this employee&apos;s goals and appraisal appear here.
          </EmptyState>
        </Card>
      </>
    );
  }

  const { goals, review, ratings } = await getAppraisal(supabase, employee.id, cycle.id);
  const status = reviewStatusOf(review);
  const stage = goalStage(goals);
  const isOpen = cycle.status === "open";
  const submittedGoals = goals.filter((g) => g.status === "submitted");

  return (
    <>
      {header}

      <Card className="mb-6 p-5">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{cycle.name}</span>
          <CycleStatusBadge status={cycle.status} />
          <span className="text-sm text-slate-400">·</span>
          <ReviewStatusBadge status={status} />
        </div>
        <ReviewStepper status={status} />
        <div className="mt-5 border-t border-slate-100 pt-5">
          <DescriptionList
            items={[
              { label: "Joined", value: formatDate(employee.date_of_joining) },
              { label: "Goals", value: <GoalStageBadge stage={stage} /> },
              { label: "Self-appraisal submitted", value: formatDateTime(review?.submitted_at) },
              { label: "Review completed", value: formatDateTime(review?.completed_at) },
            ]}
          />
        </div>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Goals                                                                */}
      {/* ------------------------------------------------------------------ */}
      <Card className="mb-6">
        <CardHeader
          title="Goals"
          description={`${goals.length} goal${goals.length === 1 ? "" : "s"} · ${totalWeight(goals)}% total weightage`}
          actions={
            isOpen && submittedGoals.length > 1 ? (
              <ActionButton action={approveAllGoals.bind(null, employee.id, cycle.id)} variant="success" confirm={`Approve all ${submittedGoals.length} submitted goals?`}>
                <Icon name="check" className="size-3.5" /> Approve all
              </ActionButton>
            ) : undefined
          }
        />
        {goals.length === 0 ? (
          <EmptyState icon={<Icon name="target" />} title="No goals yet">
            {employee.full_name.split(" ")[0]} hasn&apos;t added any goals for this cycle.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {goals.map((g) => (
              <li key={g.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{g.title}</span>
                    <GoalStatusBadge status={g.status} />
                  </div>
                  {g.description && <p className="mt-1 text-sm whitespace-pre-line text-slate-600">{g.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-slate-500">
                    <span className="font-semibold text-brand-700">{Number(g.weightage)}% weight</span>
                    <span>Target {formatDate(g.target_date)}</span>
                  </div>
                  {g.manager_comment && (
                    <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-semibold">Your comment:</span> {g.manager_comment}
                    </p>
                  )}
                </div>
                {isOpen && g.status === "submitted" && (
                  <div className="md:w-80">
                    <GoalDecision goalId={g.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Review                                                               */}
      {/* ------------------------------------------------------------------ */}
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Performance review</h2>
      {status === "not_started" ? (
        <Card>
          <EmptyState icon={<Icon name="clipboard" />} title="Waiting for the self-appraisal">
            {stage !== "approved"
              ? "Goals must be approved before the employee can write their self-appraisal."
              : `${employee.full_name.split(" ")[0]} hasn't submitted their self-appraisal yet. You'll get an e-mail when they do.`}
          </EmptyState>
        </Card>
      ) : status === "self_submitted" && isOpen && review ? (
        <ManagerReviewForm review={review} goals={goals} ratings={Object.fromEntries(ratings)} employeeName={employee.full_name} />
      ) : (
        <>
          {status === "manager_reviewed" && isOpen && review && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-violet-900">
                <div className="font-semibold">Review submitted — one step left</div>
                Check your ratings below, then complete the review. Completing locks it and shares it with {employee.full_name.split(" ")[0]}.
              </div>
              <div className="flex shrink-0 gap-2">
                <ActionButton action={reopenManagerReview.bind(null, review.id)} variant="secondary">
                  <Icon name="edit" className="size-3.5" /> Edit
                </ActionButton>
                <ActionButton action={completeReview.bind(null, review.id)} variant="primary" confirm="Complete this review? It will be locked and shared with the employee.">
                  <Icon name="check" className="size-3.5" /> Complete review
                </ActionButton>
              </div>
            </div>
          )}
          {status === "completed" && (
            <div className="mb-4">
              <Alert tone="success" title="Review completed">
                Completed on {formatDateTime(review?.completed_at)}.
              </Alert>
            </div>
          )}
          {!isOpen && status !== "completed" && (
            <div className="mb-4">
              <Alert tone="warning" title="This cycle is closed">
                The review was not completed before the cycle closed.
              </Alert>
            </div>
          )}
          {review && <ReviewView goals={goals} ratings={ratings} review={review} showManager />}
        </>
      )}
    </>
  );
}
