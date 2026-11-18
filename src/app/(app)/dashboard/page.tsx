import Link from "next/link";
import { getSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { getGoals, getOpenCycle, getReview } from "@/lib/data";
import { buildCycleReport, summarise, type ReportRow } from "@/lib/report";
import { Avatar, ButtonLink, Card, CardHeader, EmptyState, Icon, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { GoalStageBadge, ReviewStatusBadge, ReviewStepper } from "@/components/status";
import { daysUntil, formatDate, formatDateTime, goalStage, reviewStatusOf, totalWeight } from "@/lib/format";
import type { AuditEntry, CurrentUser, Employee, Goal, Review, ReviewCycle } from "@/lib/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const me = await requireUser();
  const supabase = await getSupabase();
  const cycle = await getOpenCycle(supabase);
  const firstName = me.full_name.split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(new Date())}
        title={`Welcome back, ${firstName}`}
        description={me.isHR ? "Company-wide view of the performance cycle." : me.isManager ? "Your progress and your team's, at a glance." : "Your goals and appraisal for the current cycle."}
      />

      {!cycle ? (
        <Card className="mb-6">
          <EmptyState
            icon={<Icon name="calendar" />}
            title="No review cycle is open"
            action={me.isHR ? <ButtonLink href="/admin/cycles">Create or open a cycle</ButtonLink> : <ButtonLink href="/history" variant="secondary">View past reviews</ButtonLink>}
          >
            {me.isHR ? "Open a cycle so employees can start setting goals." : "HR will open the next cycle soon. Your past reviews are always available."}
          </EmptyState>
        </Card>
      ) : (
        <>
          <CycleBanner cycle={cycle} />
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <MyProgress me={me} cycle={cycle} />
              {me.isManager && <TeamSnapshot me={me} cycle={cycle} />}
            </div>
            <div className="space-y-6 lg:col-span-2">{me.isHR ? <CompanySnapshot cycle={cycle} /> : <Guidance />}</div>
          </div>
        </>
      )}
    </>
  );
}

function CycleBanner({ cycle }: { cycle: ReviewCycle }) {
  const days = daysUntil(cycle.end_date);
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl bg-gradient-to-r from-brand-800 to-brand-600 p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-xs font-semibold tracking-wider text-brand-100 uppercase">Open cycle</div>
        <div className="mt-0.5 text-xl font-bold">{cycle.name}</div>
        <div className="text-sm text-brand-100">
          {formatDate(cycle.start_date)} – {formatDate(cycle.end_date)}
        </div>
      </div>
      <div className="rounded-lg bg-white/10 px-4 py-2 text-center ring-1 ring-white/20">
        <div className="text-2xl font-bold tabular-nums">{Math.max(0, days)}</div>
        <div className="text-xs text-brand-100">{days >= 0 ? "days left" : "past end date"}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Everyone: my own progress
// ---------------------------------------------------------------------------
async function MyProgress({ me, cycle }: { me: CurrentUser; cycle: ReviewCycle }) {
  const supabase = await getSupabase();
  const [goals, review] = await Promise.all([getGoals(supabase, me.id, cycle.id), getReview(supabase, me.id, cycle.id)]);
  const stage = goalStage(goals);
  const status = reviewStatusOf(review);
  const weight = totalWeight(goals);

  const next = nextStep(stage, status);

  return (
    <Card>
      <CardHeader title="My progress" actions={<ReviewStatusBadge status={status} />} />
      <div className="space-y-5 p-5">
        <ReviewStepper status={status} />
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
          <div>
            <div className="text-xs text-slate-500">Goals</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900">{goals.length}</span>
              <GoalStageBadge stage={stage} />
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Weightage allocated</div>
            <div className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{weight}%</div>
            <ProgressBar value={weight} tone={weight === 100 ? "emerald" : "brand"} />
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-brand-100 bg-brand-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Next step</div>
            <div className="mt-0.5 text-sm font-medium text-slate-800">{next.text}</div>
          </div>
          {next.href && (
            <ButtonLink href={next.href} size="sm">
              {next.cta} <Icon name="arrow" className="size-3.5" />
            </ButtonLink>
          )}
        </div>
      </div>
    </Card>
  );
}

function nextStep(stage: ReturnType<typeof goalStage>, status: Review["status"]) {
  if (stage === "none") return { text: "Set your goals for this cycle. Weightages must total 100%.", href: "/goals", cta: "Add goals" };
  if (stage === "draft") return { text: "Finish your goals and submit them to your manager.", href: "/goals", cta: "My goals" };
  if (stage === "sent_back") return { text: "Your manager sent goals back. Update them and resubmit.", href: "/goals", cta: "Fix goals" };
  if (stage === "pending") return { text: "Your goals are with your manager for approval.", href: "/goals", cta: "View goals" };
  if (status === "not_started") return { text: "Goals approved. Complete your self-appraisal.", href: "/review", cta: "Start self-appraisal" };
  if (status === "self_submitted") return { text: "Self-appraisal submitted. Your manager is reviewing it.", href: "/review", cta: "View" };
  if (status === "manager_reviewed") return { text: "Your manager has reviewed you and is finalising it.", href: "/review", cta: "View" };
  return { text: "Your review is complete. Well done!", href: "/review", cta: "See results" };
}

// ---------------------------------------------------------------------------
// Managers: team completion
// ---------------------------------------------------------------------------
async function TeamSnapshot({ me, cycle }: { me: CurrentUser; cycle: ReviewCycle }) {
  const supabase = await getSupabase();
  const { data: reportsData } = await supabase.from("employees").select("*").eq("manager_id", me.id).eq("is_active", true).order("full_name");
  const reports = (reportsData ?? []) as Employee[];
  const ids = reports.map((r) => r.id);
  const [g, r] = ids.length
    ? await Promise.all([
        supabase.from("goals").select("employee_id, status, weightage").eq("cycle_id", cycle.id).in("employee_id", ids),
        supabase.from("reviews").select("*").eq("cycle_id", cycle.id).in("employee_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const goals = (g.data ?? []) as Goal[];
  const reviews = (r.data ?? []) as Review[];

  const rows = reports.map((e) => {
    const eg = goals.filter((x) => x.employee_id === e.id);
    const status = reviewStatusOf(reviews.find((x) => x.employee_id === e.id));
    const pending = eg.filter((x) => x.status === "submitted").length;
    const action = pending ? `${pending} goal${pending > 1 ? "s" : ""} to approve` : status === "self_submitted" ? "Write review" : status === "manager_reviewed" ? "Complete review" : null;
    return { e, status, action };
  });
  const completed = rows.filter((x) => x.status === "completed").length;
  const todo = rows.filter((x) => x.action);

  return (
    <Card>
      <CardHeader title="My team" description={`${completed} of ${rows.length} reviews completed`} actions={<ButtonLink href="/team" variant="secondary" size="sm">Open team</ButtonLink>} />
      <div className="p-5">
        <ProgressBar value={completed} max={rows.length || 1} tone="emerald" />
        {todo.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nothing needs your attention right now.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {todo.map(({ e, action }) => (
              <li key={e.id}>
                <Link href={`/team/${e.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50">
                  <Avatar name={e.full_name} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium text-slate-900">{e.full_name}</span>
                  <span className="text-xs font-semibold text-amber-700">{action}</span>
                  <Icon name="arrow" className="size-4 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// HR: company-wide completion + recent activity
// ---------------------------------------------------------------------------
async function CompanySnapshot({ cycle }: { cycle: ReviewCycle }) {
  const supabase = await getSupabase();
  const [rows, auditRes] = await Promise.all([
    buildCycleReport(supabase, cycle.id),
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(8),
  ]);
  const s = summarise(rows);
  const names = new Map(rows.map((r: ReportRow) => [r.employee.id, r.employee.full_name]));
  const audit = (auditRes.data ?? []) as AuditEntry[];

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Completion" value={`${s.completionPct}%`} sub={`${s.completed}/${s.total} employees`} tone="emerald" />
        <StatCard label="Goals approved" value={s.goalsApproved} sub={`${s.goalsPending} pending`} tone="brand" />
      </div>
      <Card>
        <CardHeader title="Company pipeline" actions={<ButtonLink href="/admin/report" variant="secondary" size="sm">Full report</ButtonLink>} />
        <ul className="space-y-3 p-5 text-sm">
          {(
            [
              ["not_started", s.notStarted],
              ["self_submitted", s.selfSubmitted],
              ["manager_reviewed", s.managerReviewed],
              ["completed", s.completed],
            ] as const
          ).map(([st, n]) => (
            <li key={st} className="flex items-center justify-between gap-3">
              <ReviewStatusBadge status={st} />
              <div className="flex flex-1 items-center gap-3">
                <ProgressBar value={n} max={s.total || 1} tone={st === "completed" ? "emerald" : "brand"} />
                <span className="w-8 text-right font-semibold text-slate-800 tabular-nums">{n}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Recent activity" />
        {audit.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {audit.map((a) => (
              <li key={a.id} className="flex gap-3 px-5 py-3 text-sm">
                <Icon name="activity" className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <div className="text-slate-700">
                    <span className="font-medium text-slate-900">{(a.actor_id && names.get(a.actor_id)) || "System"}</span> {describe(a, names)}
                  </div>
                  <div className="text-xs text-slate-400">{formatDateTime(a.created_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function describe(a: AuditEntry, names: Map<string, string>) {
  const who = a.employee_id ? (names.get(a.employee_id) ?? "an employee") : "";
  const to = a.action.split("→")[1] ?? a.action.replace("created:", "");
  if (a.entity === "cycle") return `${a.action.startsWith("created") ? "created" : `set to ${to}`} cycle “${a.note}”`;
  if (a.entity === "goal") {
    if (a.action.startsWith("created")) return `added goal “${a.note}”`;
    return `${{ submitted: "submitted", approved: "approved", sent_back: "sent back", draft: "re-drafted" }[to] ?? to} goal “${a.note}”${who ? ` (${who})` : ""}`;
  }
  return `moved ${who}'s review to ${to.replace(/_/g, " ")}`;
}

function Guidance() {
  const tips = [
    ["KRA vs KPI vs Goal", "A KRA is an area you own, a KPI is how it's measured, a goal is the specific target for this cycle."],
    ["Write SMART goals", "Specific, Measurable, Achievable, Relevant, Time-bound. “Improve quality” is not a goal; “Cut escaped bugs by 30% by Sept” is."],
    ["Self-appraisal", "Give evidence, not adjectives — numbers, outcomes and examples. Your manager sees it side by side with their view."],
  ];
  return (
    <Card>
      <CardHeader title="How the cycle works" />
      <ul className="space-y-4 p-5">
        {tips.map(([t, b]) => (
          <li key={t} className="flex gap-3">
            <Icon name="spark" className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <div>
              <div className="text-sm font-semibold text-slate-900">{t}</div>
              <p className="text-sm text-slate-600">{b}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
