"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { getCycle, getEmployee, getGoalRatings, getGoals } from "@/lib/data";
import { notifyEmployeeGoalsDecided, notifyEmployeeReviewCompleted } from "@/lib/notifications";
import type { ActionState, Goal, Review } from "@/lib/types";

// Manager actions. The database decides whether the signed-in user is this
// employee's manager (or HR): if not, RLS makes the update match zero rows and
// the trigger rejects illegal status changes. We still check the row count so
// the user gets a clear message.

async function afterGoalDecision(employeeId: string, cycleId: string) {
  const supabase = await getSupabase();
  const goals = await getGoals(supabase, employeeId, cycleId);
  // Only e-mail once the manager has dealt with every submitted goal.
  if (!goals.some((g) => g.status === "submitted")) {
    const [employee, cycle] = await Promise.all([getEmployee(supabase, employeeId), getCycle(supabase, cycleId)]);
    if (employee && cycle) {
      await notifyEmployeeGoalsDecided(employee, cycle.name, goals.filter((g) => g.status === "sent_back").length);
    }
  }
  revalidatePath(`/team/${employeeId}`);
  revalidatePath("/team");
  revalidatePath("/dashboard");
}

export async function decideGoal(goalId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const decision = fd.get("decision");
  const comment = String(fd.get("comment") ?? "").trim();
  if (decision !== "approved" && decision !== "sent_back") return { error: "Choose approve or send back." };
  if (decision === "sent_back" && comment.length < 5) {
    return { error: "Explain what needs to change before sending a goal back.", fieldErrors: { comment: "A comment is required to send a goal back" } };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("goals")
    .update({ status: decision, manager_comment: comment || null })
    .eq("id", goalId)
    .select("employee_id, cycle_id")
    .maybeSingle<Pick<Goal, "employee_id" | "cycle_id">>();
  if (error) return { error: error.message };
  if (!data) return { error: "You are not allowed to change this goal." };

  await afterGoalDecision(data.employee_id, data.cycle_id);
  return { ok: decision === "approved" ? "Goal approved." : "Goal sent back with your comment." };
}

export async function approveAllGoals(employeeId: string, cycleId: string): Promise<ActionState> {
  await requireUser();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("goals")
    .update({ status: "approved" })
    .eq("employee_id", employeeId)
    .eq("cycle_id", cycleId)
    .eq("status", "submitted")
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "No submitted goals to approve." };
  await afterGoalDecision(employeeId, cycleId);
  return { ok: "All goals approved." };
}

function parseRating(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return v != null && v !== "" && Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** Save (intent=draft) or submit (intent=submit) the manager's ratings for a review. */
export async function saveManagerReview(reviewId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const submit = fd.get("intent") === "submit";
  const supabase = await getSupabase();

  const { data: review } = await supabase.from("reviews").select("*").eq("id", reviewId).maybeSingle<Review>();
  if (!review) return { error: "Review not found." };
  if (review.status !== "self_submitted" && review.status !== "manager_reviewed") {
    return { error: "This review is not open for manager input." };
  }

  const ratings = await getGoalRatings(supabase, reviewId);
  const fieldErrors: Record<string, string> = {};
  const updates = ratings.map((r) => {
    const manager_rating = parseRating(fd.get(`rating_${r.goal_id}`));
    const manager_comment = String(fd.get(`comment_${r.goal_id}`) ?? "").trim();
    if (submit && !manager_rating) fieldErrors[`rating_${r.goal_id}`] = "Choose a rating";
    if (submit && manager_comment.length < 10) fieldErrors[`comment_${r.goal_id}`] = "Add a comment (at least 10 characters)";
    return { id: r.id, manager_rating, manager_comment: manager_comment || null };
  });
  const overall_manager_rating = parseRating(fd.get("overall_rating"));
  const manager_summary = String(fd.get("summary") ?? "").trim() || null;
  if (submit && !overall_manager_rating) fieldErrors.overall_rating = "Choose an overall rating";
  if (submit && (manager_summary?.length ?? 0) < 20) fieldErrors.summary = "Write a summary (at least 20 characters)";
  if (Object.keys(fieldErrors).length) return { error: "Rate and comment on every goal, and add an overall rating and summary.", fieldErrors };

  for (const u of updates) {
    const { error } = await supabase
      .from("goal_ratings")
      .update({ manager_rating: u.manager_rating, manager_comment: u.manager_comment })
      .eq("id", u.id);
    if (error) return { error: error.message };
  }

  const { data: saved, error } = await supabase
    .from("reviews")
    .update({ overall_manager_rating, manager_summary, ...(submit ? { status: "manager_reviewed" } : {}) })
    .eq("id", reviewId)
    .select("id");
  if (error) return { error: error.message };
  if (!saved?.length) return { error: "You are not allowed to review this employee." };

  revalidatePath(`/team/${review.employee_id}`);
  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { ok: submit ? "Review submitted. Check it over, then mark it complete to share it with the employee." : "Draft saved." };
}

/** Final step: lock the review and share it with the employee. */
export async function completeReview(reviewId: string): Promise<ActionState> {
  await requireUser();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("reviews")
    .update({ status: "completed" })
    .eq("id", reviewId)
    .select("*")
    .maybeSingle<Review>();
  if (error) return { error: error.message };
  if (!data) return { error: "You are not allowed to complete this review." };

  const [employee, cycle] = await Promise.all([getEmployee(supabase, data.employee_id), getCycle(supabase, data.cycle_id)]);
  if (employee && cycle) await notifyEmployeeReviewCompleted(employee, cycle.name, data.id);

  revalidatePath(`/team/${data.employee_id}`);
  revalidatePath("/team");
  revalidatePath("/dashboard");
  revalidatePath("/admin/report");
  return { ok: "Review completed." };
}

/** Let the manager re-open their own submitted (not yet completed) review for edits. */
export async function reopenManagerReview(reviewId: string): Promise<ActionState> {
  await requireUser();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("reviews")
    .update({ status: "self_submitted" })
    .eq("id", reviewId)
    .eq("status", "manager_reviewed")
    .select("employee_id")
    .maybeSingle<Pick<Review, "employee_id">>();
  if (error) return { error: error.message };
  if (!data) return { error: "This review cannot be re-opened." };
  revalidatePath(`/team/${data.employee_id}`);
  return {};
}
