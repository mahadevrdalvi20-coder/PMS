import { cn, Icon } from "@/components/ui";
import {
  CYCLE_STATUS_LABEL,
  GOAL_STAGE_LABEL,
  GOAL_STATUS_LABEL,
  REVIEW_STATUS_LABEL,
  REVIEW_STEPS,
  ratingLabel,
  type GoalStage,
} from "@/lib/format";
import type { CycleStatus, GoalStatus, ReviewStatus } from "@/lib/types";

// Status must be "visible everywhere" — these badges are the single source of
// truth for how each status looks.

const TONES = {
  gray: "bg-slate-100 text-slate-700 ring-slate-500/15",
  blue: "bg-brand-50 text-brand-800 ring-brand-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  violet: "bg-violet-50 text-violet-800 ring-violet-600/20",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  red: "bg-red-50 text-red-800 ring-red-600/20",
} as const;
type Tone = keyof typeof TONES;

export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONES[tone], className)}>
      {children}
    </span>
  );
}

const REVIEW_TONE: Record<ReviewStatus, Tone> = {
  not_started: "gray",
  self_submitted: "amber",
  manager_reviewed: "violet",
  completed: "green",
};
export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge tone={REVIEW_TONE[status]}>{REVIEW_STATUS_LABEL[status]}</Badge>;
}

const GOAL_TONE: Record<GoalStatus, Tone> = { draft: "gray", submitted: "amber", approved: "green", sent_back: "red" };
export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return <Badge tone={GOAL_TONE[status]}>{GOAL_STATUS_LABEL[status]}</Badge>;
}

const STAGE_TONE: Record<GoalStage, Tone> = { none: "gray", draft: "gray", sent_back: "red", pending: "amber", approved: "green" };
export function GoalStageBadge({ stage }: { stage: GoalStage }) {
  return <Badge tone={STAGE_TONE[stage]}>{GOAL_STAGE_LABEL[stage]}</Badge>;
}

const CYCLE_TONE: Record<CycleStatus, Tone> = { draft: "gray", open: "green", closed: "blue" };
export function CycleStatusBadge({ status }: { status: CycleStatus }) {
  return (
    <Badge tone={CYCLE_TONE[status]}>
      {status === "open" && <span className="size-1.5 rounded-full bg-emerald-500" />}
      {CYCLE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function RatingPill({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-sm text-slate-400">—</span>;
  const tone: Tone = value >= 4 ? "green" : value === 3 ? "blue" : value === 2 ? "amber" : "red";
  return (
    <Badge tone={tone}>
      <span className="font-bold tabular-nums">{Number.isInteger(value) ? value : value.toFixed(2)}</span>
      <span className="hidden sm:inline">· {ratingLabel(value)}</span>
    </Badge>
  );
}

/** Horizontal stepper showing the review workflow. */
export function ReviewStepper({ status }: { status: ReviewStatus }) {
  const current = REVIEW_STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Review progress">
      {REVIEW_STEPS.map((step, i) => {
        const done = i < current || status === "completed";
        const active = i === current && status !== "completed";
        return (
          <li key={step} className="flex flex-col gap-2">
            <div className={cn("h-1.5 rounded-full", done ? "bg-emerald-500" : active ? "bg-brand-600" : "bg-slate-200")} />
            <div className="flex items-start gap-1.5">
              {done ? (
                <Icon name="check" className="mt-px size-3.5 shrink-0 text-emerald-600" />
              ) : (
                <span className={cn("mt-1 size-2 shrink-0 rounded-full", active ? "bg-brand-600" : "bg-slate-300")} />
              )}
              <span className={cn("text-[11px] leading-tight font-medium sm:text-xs", active ? "text-slate-900" : "text-slate-500")}>
                {REVIEW_STATUS_LABEL[step]}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
