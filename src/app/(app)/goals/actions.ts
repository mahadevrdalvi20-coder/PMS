"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { getEmployee, getGoals, getOpenCycle } from "@/lib/data";
import { totalWeight } from "@/lib/format";
import { notifyManagerGoalsSubmitted } from "@/lib/notifications";
import type { ActionState } from "@/lib/types";

const MAX_GOALS = 10;

/** Create or edit one of MY goals in the open cycle. */
export async function saveGoal(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const supabase = await getSupabase();
  const cycle = await getOpenCycle(supabase);
  if (!cycle) return { error: "There is no open review cycle." };

  const id = String(fd.get("id") ?? "") || null;
  const title = String(fd.get("title") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  const weightRaw = String(fd.get("weightage") ?? "").trim();
  const target_date = String(fd.get("target_date") ?? "").trim();
  const weightage = Number(weightRaw);

  // --- validation -----------------------------------------------------------
  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Give the goal a short title";
  else if (title.length > 140) fieldErrors.title = "Keep the title under 140 characters";
  if (!description) fieldErrors.description = "Describe what success looks like (how it will be measured)";
  if (weightRaw === "" || !Number.isFinite(weightage)) fieldErrors.weightage = "Weightage must be a number";
  else if (weightage <= 0 || weightage > 100) fieldErrors.weightage = "Weightage must be between 1 and 100";
  else if (Math.round(weightage * 100) !== weightage * 100) fieldErrors.weightage = "Use at most 2 decimal places";
  if (!target_date) fieldErrors.target_date = "Pick a target date";
  else if (target_date < cycle.start_date || target_date > cycle.end_date)
    fieldErrors.target_date = `Must fall inside the cycle (${cycle.start_date} to ${cycle.end_date})`;

  const goals = await getGoals(supabase, me.id, cycle.id);
  const others = goals.filter((g) => g.id !== id);
  if (!fieldErrors.weightage) {
    const newTotal = totalWeight([...others, { weightage }]);
    if (newTotal > 100) fieldErrors.weightage = `Total weightage would be ${newTotal}% — the maximum is 100%. ${100 - totalWeight(others)}% is left.`;
  }
  if (!id && goals.length >= MAX_GOALS) return { error: `You can have at most ${MAX_GOALS} goals in a cycle.` };
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields.", fieldErrors };

  // --- write ----------------------------------------------------------------
  const values = { title, description, weightage, target_date };
  const { error } = id
    ? await supabase.from("goals").update(values).eq("id", id).eq("employee_id", me.id)
    : await supabase.from("goals").insert({ ...values, employee_id: me.id, cycle_id: cycle.id });
  if (error) return { error: error.message };

  revalidatePath("/goals");
  return { ok: id ? "Goal updated." : "Goal added." };
}

export async function deleteGoal(goalId: string): Promise<ActionState> {
  const me = await requireUser();
  const supabase = await getSupabase();
  const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("employee_id", me.id);
  if (error) return { error: error.message };
  revalidatePath("/goals");
  return {};
}

/** Send every draft / sent-back goal to the manager. Weightage must total exactly 100. */
export async function submitGoals(): Promise<ActionState> {
  const me = await requireUser();
  const supabase = await getSupabase();
  const cycle = await getOpenCycle(supabase);
  if (!cycle) return { error: "There is no open review cycle." };

  const goals = await getGoals(supabase, me.id, cycle.id);
  const total = totalWeight(goals);
  if (goals.length === 0) return { error: "Add at least one goal first." };
  if (total !== 100) return { error: `Goal weightages must total exactly 100%. They currently total ${total}%.` };

  const toSubmit = goals.filter((g) => g.status === "draft" || g.status === "sent_back");
  if (toSubmit.length === 0) return { error: "There is nothing new to submit." };

  const { error } = await supabase
    .from("goals")
    .update({ status: "submitted" })
    .in("id", toSubmit.map((g) => g.id));
  if (error) return { error: error.message };

  // E-mail the manager. Never blocks the submission (sendEmail never throws).
  if (me.manager_id) {
    const manager = await getEmployee(supabase, me.manager_id);
    if (manager) await notifyManagerGoalsSubmitted(manager, me, cycle.name);
  }

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: `${toSubmit.length} goal${toSubmit.length > 1 ? "s" : ""} sent to your manager for approval.` };
}
