"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { requireHR } from "@/lib/session";
import type { ActionState, AppRole, CycleStatus } from "@/lib/types";

const ROLES: AppRole[] = ["employee", "manager", "hr_admin"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------
export async function saveEmployee(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireHR();

  const id = text(fd, "id") || null;
  const values = {
    full_name: text(fd, "full_name"),
    email: text(fd, "email").toLowerCase(),
    designation: text(fd, "designation") || null,
    department: text(fd, "department") || null,
    date_of_joining: text(fd, "date_of_joining") || null,
    manager_id: text(fd, "manager_id") || null,
    role: text(fd, "role") as AppRole,
    is_active: id ? fd.get("is_active") === "on" : true,
  };

  const fieldErrors: Record<string, string> = {};
  if (!values.full_name) fieldErrors.full_name = "Name is required";
  if (!EMAIL_RE.test(values.email)) fieldErrors.email = "Enter a valid e-mail address";
  if (!values.designation) fieldErrors.designation = "Designation is required";
  if (!values.department) fieldErrors.department = "Department is required";
  if (!values.date_of_joining || !DATE_RE.test(values.date_of_joining)) fieldErrors.date_of_joining = "Date of joining is required";
  else if (new Date(values.date_of_joining) > new Date()) fieldErrors.date_of_joining = "Date of joining cannot be in the future";
  if (!ROLES.includes(values.role)) fieldErrors.role = "Choose a role";
  if (id && values.manager_id === id) fieldErrors.manager_id = "An employee cannot report to themselves";
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields.", fieldErrors };

  const supabase = await getSupabase();
  const { error } = id
    ? await supabase.from("employees").update(values).eq("id", id)
    : await supabase.from("employees").insert(values);

  if (error) {
    if (error.code === "23505") return { error: "That e-mail already exists.", fieldErrors: { email: "Another employee already uses this e-mail" } };
    if (error.message.includes("loop")) return { error: error.message, fieldErrors: { manager_id: "This would create a reporting loop" } };
    return { error: error.message };
  }

  revalidatePath("/admin/employees");
  redirect(`/admin/employees?saved=${encodeURIComponent(values.full_name)}`);
}

// ---------------------------------------------------------------------------
// Review cycles
// ---------------------------------------------------------------------------
export async function createCycle(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireHR();
  const name = text(fd, "name");
  const start_date = text(fd, "start_date");
  const end_date = text(fd, "end_date");

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Give the cycle a name, e.g. FY 2026–27 Annual";
  if (!DATE_RE.test(start_date)) fieldErrors.start_date = "Start date is required";
  if (!DATE_RE.test(end_date)) fieldErrors.end_date = "End date is required";
  else if (start_date && end_date <= start_date) fieldErrors.end_date = "End date must be after the start date";
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields.", fieldErrors };

  const supabase = await getSupabase();
  const { error } = await supabase.from("review_cycles").insert({ name, start_date, end_date, created_by: me.id });
  if (error) return { error: error.message };

  revalidatePath("/admin/cycles");
  return { ok: `Cycle “${name}” created as a draft. Open it when you are ready.` };
}

export async function setCycleStatus(cycleId: string, status: CycleStatus): Promise<ActionState> {
  await requireHR();
  const supabase = await getSupabase();
  const { error } = await supabase.from("review_cycles").update({ status }).eq("id", cycleId);
  if (error) {
    if (error.code === "23505") return { error: "Another cycle is already open. Close it first." };
    return { error: error.message };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function deleteCycle(cycleId: string): Promise<ActionState> {
  await requireHR();
  const supabase = await getSupabase();
  const { error } = await supabase.from("review_cycles").delete().eq("id", cycleId).eq("status", "draft");
  if (error) return { error: error.message };
  revalidatePath("/admin/cycles");
  return {};
}
