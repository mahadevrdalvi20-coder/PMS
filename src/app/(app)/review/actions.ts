"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { getEmployee, getGoals, getOpenCycle, getReview } from "@/lib/data";
import { totalWeight } from "@/lib/format";
import { notifyManagerSelfAppraisal } from "@/lib/notifications";
import type { ActionState } from "@/lib/types";

function parseRating(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return v != null && v !== "" && Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/**
 * Save (intent=draft) or submit (intent=submit) MY self-appraisal for the open cycle.
 * The review row is created on first save — one row per employee per cycle.
 */
export async function saveSelfAppraisal(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const submit = fd.get("intent") === "submit";
  const supabase = await getSupabase();

  const cycle = await getOpenCycle(supabase);
  if (!cycle) return { error: "There is no open review cycle." };

  const goals = await getGoals(supabase, me.id, cycle.id);
  if (goals.length === 0 || goals.some((g) => g.status !== "approved") || totalWeight(goals) !== 100) {
    return { error: "All your goals must be approved (and total 100%) before the self-appraisal." };
  }

  // --- read + validate ------------------------------------------------------
  const fieldErrors: Record<string, string> = {};
  const rows = goals.map((g) => {
    const self_rating = parseRating(fd.get(`rating_${g.id}`));
    const self_comment = String(fd.get(`comment_${g.id}`) ?? "").trim();
    if (submit && !self_rating) fieldErrors[`rating_${g.id}`] = "Choose a rating";
    if (submit && self_comment.length < 10) fieldErrors[`comment_${g.id}`] = "Describe what you achieved (at least 10 characters)";
    return { goal_id: g.id, self_rating, self_comment: self_comment || null };
  });
  const overall_self_rating = parseRating(fd.get("overall_rating"));
  const self_summary = String(fd.get("summary") ?? "").trim() || null;
  if (submit && !overall_self_rating) fieldErrors.overall_rating = "Choose an overall rating";

  if (Object.keys(fieldErrors).length) {
    return { error: "Rate every goal and explain what you achieved before submitting.", fieldErrors };
  }

  // --- write ----------------------------------------------------------------
  let review = await getReview(supabase, me.id, cycle.id);
  if (!review) {
    const { data, error } = await supabase.from("reviews").insert({ employee_id: me.id, cycle_id: cycle.id }).select("*").single();
    if (error) return { error: error.message };
    review = data;
  }
  if (review!.status !== "not_started") return { error: "Your self-appraisal has already been submitted." };

  const { error: ratingsError } = await supabase
    .from("goal_ratings")
    .upsert(rows.map((r) => ({ ...r, review_id: review!.id })), { onConflict: "review_id,goal_id" });
  if (ratingsError) return { error: ratingsError.message };

  const { error: reviewError } = await supabase
    .from("reviews")
    .update({ overall_self_rating, self_summary, ...(submit ? { status: "self_submitted" } : {}) })
    .eq("id", review!.id);
  if (reviewError) return { error: reviewError.message };

  // Notify the manager. sendEmail() never throws, so a mail failure cannot undo the submission.
  if (submit && me.manager_id) {
    const manager = await getEmployee(supabase, me.manager_id);
    if (manager) await notifyManagerSelfAppraisal(manager, me, cycle.name);
  }

  revalidatePath("/review");
  revalidatePath("/dashboard");
  return { ok: submit ? "Self-appraisal submitted. Your manager has been notified." : "Draft saved." };
}
