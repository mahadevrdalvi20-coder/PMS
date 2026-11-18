import type { CycleStatus, Goal, GoalStatus, Review, ReviewStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Rating scale — 5 points with behavioural labels (see RESEARCH.md §5 for why).
// ---------------------------------------------------------------------------
export const RATING_SCALE = [
  { value: 1, label: "Unsatisfactory", short: "Unsat." },
  { value: 2, label: "Needs Improvement", short: "Needs Imp." },
  { value: 3, label: "Meets Expectations", short: "Meets" },
  { value: 4, label: "Exceeds Expectations", short: "Exceeds" },
  { value: 5, label: "Outstanding", short: "Outstanding" },
] as const;

export function ratingLabel(value: number | null | undefined) {
  if (value == null) return "—";
  return RATING_SCALE.find((r) => r.value === Math.round(value))?.label ?? String(value);
}

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------
export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  not_started: "Not Started",
  self_submitted: "Self-Appraisal Submitted",
  manager_reviewed: "Manager Reviewed",
  completed: "Completed",
};

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  sent_back: "Sent Back",
};

export const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
};

/** Ordered list used for the progress stepper. */
export const REVIEW_STEPS: ReviewStatus[] = ["not_started", "self_submitted", "manager_reviewed", "completed"];

// ---------------------------------------------------------------------------
// Goal-setting stage: a one-word summary of where an employee's goals are.
// ---------------------------------------------------------------------------
export type GoalStage = "none" | "draft" | "sent_back" | "pending" | "approved";

export const GOAL_STAGE_LABEL: Record<GoalStage, string> = {
  none: "Not set",
  draft: "In draft",
  sent_back: "Sent back",
  pending: "Awaiting approval",
  approved: "Approved",
};

export function goalStage(goals: Pick<Goal, "status" | "weightage">[]): GoalStage {
  if (goals.length === 0) return "none";
  if (goals.some((g) => g.status === "sent_back")) return "sent_back";
  if (goals.some((g) => g.status === "draft")) return "draft";
  if (goals.some((g) => g.status === "submitted")) return "pending";
  return totalWeight(goals) === 100 ? "approved" : "draft";
}

export function totalWeight(goals: Pick<Goal, "weightage">[]) {
  // Round to 2 dp to avoid floating-point surprises (33.33 + 33.33 + 33.34).
  return Math.round(goals.reduce((sum, g) => sum + Number(g.weightage), 0) * 100) / 100;
}

/** Weighted score: Σ(rating × weight) / 100, e.g. 3.85. */
export function weightedScore(
  items: { weightage: number; rating: number | null | undefined }[],
): number | null {
  if (items.length === 0 || items.some((i) => i.rating == null)) return null;
  const score = items.reduce((s, i) => s + Number(i.weightage) * (i.rating as number), 0) / 100;
  return Math.round(score * 100) / 100;
}

export function reviewStatusOf(review: Pick<Review, "status"> | null | undefined): ReviewStatus {
  return review?.status ?? "not_started";
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------
// Pages render on the server (UTC on Vercel), so pin the zone explicitly.
const TIME_ZONE = "Asia/Kolkata";
const dateOnlyFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** "2026-04-01" (a DATE column) or an ISO timestamp → "1 Apr 2026". */
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  if (value.length === 10) return dateOnlyFmt.format(new Date(`${value}T00:00:00Z`));
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return dateTimeFmt.format(new Date(value));
}

export function daysUntil(date: string) {
  const end = new Date(`${date}T23:59:59Z`).getTime();
  return Math.ceil((end - Date.now()) / 86_400_000);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
