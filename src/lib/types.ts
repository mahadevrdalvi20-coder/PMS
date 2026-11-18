// Row shapes that mirror supabase/schema.sql. Keep these in sync with the SQL.

export type AppRole = "employee" | "manager" | "hr_admin";
export type CycleStatus = "draft" | "open" | "closed";
export type GoalStatus = "draft" | "submitted" | "approved" | "sent_back";
export type ReviewStatus = "not_started" | "self_submitted" | "manager_reviewed" | "completed";

export interface Employee {
  id: string;
  clerk_user_id: string | null;
  full_name: string;
  email: string;
  designation: string | null;
  department: string | null;
  date_of_joining: string | null;
  manager_id: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
}

export interface ReviewCycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: CycleStatus;
  created_by: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  employee_id: string;
  cycle_id: string;
  title: string;
  description: string | null;
  weightage: number;
  target_date: string | null;
  status: GoalStatus;
  manager_comment: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface GoalRating {
  id: string;
  review_id: string;
  goal_id: string;
  self_comment: string | null;
  self_rating: number | null;
  manager_comment: string | null;
  manager_rating: number | null;
}

export interface Review {
  id: string;
  employee_id: string;
  manager_id: string | null;
  cycle_id: string;
  status: ReviewStatus;
  overall_self_rating: number | null;
  self_summary: string | null;
  overall_manager_rating: number | null;
  manager_summary: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
}

export interface AuditEntry {
  id: number;
  actor_id: string | null;
  entity: "goal" | "review" | "cycle";
  entity_id: string;
  employee_id: string | null;
  action: string;
  note: string | null;
  created_at: string;
}

/** The signed-in person, as the app sees them. */
export interface CurrentUser extends Employee {
  /** Number of active direct reports — a "manager" is anyone with at least one. */
  reportCount: number;
  isHR: boolean;
  isManager: boolean;
}

/** Return value shared by every form's server action. */
export interface ActionState {
  ok?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}
