import Link from "next/link";
import { getSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { getEmployee, getGoals, getOpenCycle } from "@/lib/data";
import { Alert, Card, CardHeader, EmptyState, Icon, PageHeader, ProgressBar } from "@/components/ui";
import { CycleStatusBadge, GoalStageBadge } from "@/components/status";
import { ActionButton } from "@/components/action-button";
import { formatDate, goalStage, totalWeight } from "@/lib/format";
import { submitGoals } from "./actions";
import { GoalCard } from "./goal-card";
import { GoalForm } from "./goal-form";

export const metadata = { title: "My Goals" };

export default async function GoalsPage() {
  const me = await requireUser();
  const supabase = await getSupabase();
  const cycle = await getOpenCycle(supabase);

  if (!cycle) {
    return (
      <>
        <PageHeader title="My Goals" />
        <Card>
          <EmptyState icon={<Icon name="calendar" />} title="No review cycle is open right now">
            Goals are always set against a review cycle. HR will open the next one — you&apos;ll be able to add goals here as soon as they do.{" "}
            <Link href="/history" className="font-semibold text-brand-700">See past reviews →</Link>
          </EmptyState>
        </Card>
      </>
    );
  }

  const [goals, manager] = await Promise.all([getGoals(supabase, me.id, cycle.id), me.manager_id ? getEmployee(supabase, me.manager_id) : null]);
  const total = totalWeight(goals);
  const stage = goalStage(goals);
  const editableGoals = goals.filter((g) => g.status === "draft" || g.status === "sent_back");
  const canSubmit = total === 100 && editableGoals.length > 0;
  const remaining = Math.round((100 - total) * 100) / 100;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            {cycle.name} <CycleStatusBadge status={cycle.status} />
          </span>
        }
        title="My Goals"
        description={`Set goals for ${formatDate(cycle.start_date)} – ${formatDate(cycle.end_date)}. Weightages must add up to exactly 100% before you can submit them to ${manager ? manager.full_name : "your manager"}.`}
      />

      {stage === "sent_back" && (
        <div className="mb-4">
          <Alert tone="error" title="Your manager sent some goals back">
            Read their comment on each goal, make the changes and submit again.
          </Alert>
        </div>
      )}
      {stage === "approved" && (
        <div className="mb-4">
          <Alert tone="success" title="All your goals are approved">
            Next step: <Link href="/review" className="font-semibold underline">complete your self-appraisal</Link> when you are ready.
          </Alert>
        </div>
      )}
      {!me.manager_id && (
        <div className="mb-4">
          <Alert tone="warning" title="You have no manager assigned">
            HR will approve your goals and review you. Contact HR if this is wrong.
          </Alert>
        </div>
      )}

      {/* Weightage summary */}
      <Card className="mb-6 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Total weightage</span>
              <GoalStageBadge stage={stage} />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-3xl font-bold tabular-nums ${total === 100 ? "text-emerald-600" : total > 100 ? "text-red-600" : "text-slate-900"}`}>{total}%</span>
              <span className="text-sm text-slate-500">of 100% · {goals.length} goal{goals.length === 1 ? "" : "s"}</span>
            </div>
            <div className="mt-3 max-w-md">
              <ProgressBar value={total} tone={total === 100 ? "emerald" : total > 100 ? "red" : "brand"} />
            </div>
            {total !== 100 && goals.length > 0 && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                {total < 100 ? `${remaining}% still to allocate before you can submit.` : `${total - 100}% over — reduce a weightage.`}
              </p>
            )}
          </div>
          {editableGoals.length > 0 && (
            <div className="flex flex-col items-stretch sm:items-end">
              <ActionButton action={submitGoals} variant="primary" size="md" confirm="Submit your goals to your manager? You can't edit them while they're being reviewed.">
                <Icon name="send" className="size-4" /> Submit for approval
              </ActionButton>
              {!canSubmit && <p className="mt-1 text-xs text-slate-500">Weightage must total exactly 100%.</p>}
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {goals.length === 0 ? (
            <Card>
              <EmptyState icon={<Icon name="target" />} title="You haven't added any goals yet">
                Most roles have 3–5 goals. Give each one a weightage that reflects how much of your year it should take — together they must total 100%.
              </EmptyState>
            </Card>
          ) : (
            goals.map((g, i) => (
              <GoalCard key={g.id} goal={g} index={i} totalWeight={total} minDate={cycle.start_date} maxDate={cycle.end_date} editable />
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {total < 100 ? (
            <Card className="lg:sticky lg:top-6">
              <CardHeader title="Add a goal" description="Write it SMART: Specific, Measurable, Achievable, Relevant, Time-bound." />
              <div className="p-5">
                <GoalForm otherWeight={total} minDate={cycle.start_date} maxDate={cycle.end_date} />
              </div>
            </Card>
          ) : (
            <Card className="p-5 text-sm text-slate-600">
              <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                <Icon name="check" className="size-4 text-emerald-600" /> 100% allocated
              </div>
              To add another goal, first reduce the weightage of an existing draft goal.
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
