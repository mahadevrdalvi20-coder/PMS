import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { goalStage, reviewStatusOf, totalWeight, type GoalStage } from "@/lib/format";
import type { Employee, Goal, Review, ReviewStatus } from "@/lib/types";

export interface ReportRow {
  employee: Employee;
  manager: Employee | null;
  goalCount: number;
  weight: number;
  stage: GoalStage;
  status: ReviewStatus;
  review: Review | null;
}

/**
 * One row per active employee for a cycle: where their goals and review are.
 * Employees who never started are included (status "not_started") — the
 * point of a completion report is to find who has NOT submitted.
 * Only HR can see everyone; for anyone else RLS trims the result.
 */
export async function buildCycleReport(supabase: SupabaseClient, cycleId: string): Promise<ReportRow[]> {
  const [emp, goals, reviews] = await Promise.all([
    supabase.from("employees").select("*").order("full_name"),
    supabase.from("goals").select("employee_id, status, weightage").eq("cycle_id", cycleId),
    supabase.from("reviews").select("*").eq("cycle_id", cycleId),
  ]);
  const all = (emp.data ?? []) as Employee[];
  const byId = new Map(all.map((e) => [e.id, e]));
  const goalsBy = new Map<string, Pick<Goal, "status" | "weightage">[]>();
  for (const g of (goals.data ?? []) as Goal[]) goalsBy.set(g.employee_id, [...(goalsBy.get(g.employee_id) ?? []), g]);
  const reviewBy = new Map(((reviews.data ?? []) as Review[]).map((r) => [r.employee_id, r]));

  return all
    .filter((e) => e.is_active || reviewBy.has(e.id))
    .map((e) => {
      const g = goalsBy.get(e.id) ?? [];
      const review = reviewBy.get(e.id) ?? null;
      return {
        employee: e,
        manager: e.manager_id ? (byId.get(e.manager_id) ?? null) : null,
        goalCount: g.length,
        weight: totalWeight(g),
        stage: goalStage(g),
        status: reviewStatusOf(review),
        review,
      };
    });
}

export function summarise(rows: ReportRow[]) {
  const by = (s: ReviewStatus) => rows.filter((r) => r.status === s).length;
  const total = rows.length;
  const completed = by("completed");
  return {
    total,
    goalsApproved: rows.filter((r) => r.stage === "approved").length,
    goalsPending: rows.filter((r) => r.stage === "pending").length,
    notStarted: by("not_started"),
    selfSubmitted: by("self_submitted"),
    managerReviewed: by("manager_reviewed"),
    completed,
    completionPct: total ? Math.round((completed / total) * 100) : 0,
  };
}
