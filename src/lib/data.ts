import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Employee, Goal, GoalRating, Review, ReviewCycle } from "@/lib/types";

// Small, reusable reads. Every one of them runs through the user's own
// Supabase client, so Row Level Security filters the results automatically.

export async function getOpenCycle(sb: SupabaseClient) {
  const { data } = await sb.from("review_cycles").select("*").eq("status", "open").maybeSingle<ReviewCycle>();
  return data;
}

export async function getCycles(sb: SupabaseClient) {
  const { data } = await sb.from("review_cycles").select("*").order("start_date", { ascending: false });
  return (data ?? []) as ReviewCycle[];
}

export async function getCycle(sb: SupabaseClient, id: string) {
  const { data } = await sb.from("review_cycles").select("*").eq("id", id).maybeSingle<ReviewCycle>();
  return data;
}

export async function getEmployee(sb: SupabaseClient, id: string) {
  const { data } = await sb.from("employees").select("*").eq("id", id).maybeSingle<Employee>();
  return data;
}

export async function getActiveEmployees(sb: SupabaseClient) {
  const { data } = await sb.from("employees").select("*").eq("is_active", true).order("full_name");
  return (data ?? []) as Employee[];
}

export async function getGoals(sb: SupabaseClient, employeeId: string, cycleId: string) {
  const { data } = await sb
    .from("goals")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("cycle_id", cycleId)
    .order("created_at");
  return (data ?? []) as Goal[];
}

export async function getReview(sb: SupabaseClient, employeeId: string, cycleId: string) {
  const { data } = await sb
    .from("reviews")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("cycle_id", cycleId)
    .maybeSingle<Review>();
  return data;
}

export async function getGoalRatings(sb: SupabaseClient, reviewId: string) {
  const { data } = await sb.from("goal_ratings").select("*").eq("review_id", reviewId);
  return (data ?? []) as GoalRating[];
}

/** Map of goal_id → rating row, for quick lookups when rendering. */
export function byGoal(ratings: GoalRating[]) {
  return new Map(ratings.map((r) => [r.goal_id, r]));
}

/** Everything needed to render one employee's appraisal for one cycle. */
export async function getAppraisal(sb: SupabaseClient, employeeId: string, cycleId: string) {
  const [goals, review] = await Promise.all([getGoals(sb, employeeId, cycleId), getReview(sb, employeeId, cycleId)]);
  const ratings = review ? await getGoalRatings(sb, review.id) : [];
  return { goals, review, ratings: byGoal(ratings) };
}
