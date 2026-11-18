import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { CurrentUser, Employee } from "@/lib/types";

type Lookup =
  | { status: "signed_out" }
  | { status: "not_registered"; email?: string }
  | { status: "inactive" }
  | { status: "ok"; user: CurrentUser };

/**
 * Who is signed in, as an EMPLOYEE (not just a Clerk account)?
 *
 * 1. Clerk tells us the user id.
 * 2. We look for an employees row with that clerk_user_id (normal case).
 * 3. First sign-in: no row has that id yet, so we match the user's VERIFIED
 *    Clerk e-mail to the e-mail HR typed in, and store the clerk_user_id on
 *    that row. From then on step 2 finds them.
 *
 * Runs on the server only. Wrapped in `cache` so a page, its layout and its
 * actions share one lookup per request.
 */
export const lookupCurrentUser = cache(async (): Promise<Lookup> => {
  const { userId } = await auth();
  if (!userId) return { status: "signed_out" };

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle<Employee>();
  if (error) redirectToSetup(error);
  let me = data;

  if (!me) {
    const linked = await linkClerkUser(userId);
    if (linked.status !== "ok") return linked;
    me = linked.employee;
  }

  const { count } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("manager_id", me.id)
    .eq("is_active", true);

  const reportCount = count ?? 0;
  return {
    status: "ok",
    user: {
      ...me,
      reportCount,
      isHR: me.role === "hr_admin",
      isManager: reportCount > 0 || me.role === "manager",
    },
  };
});

/**
 * A Supabase error on this very first query is almost always a configuration
 * problem (Clerk not connected to Supabase, or schema.sql not run). Send the
 * user to /setup with a clear explanation instead of a generic 500 page.
 */
function redirectToSetup(error: { message: string; code?: string }): never {
  const msg = error.message ?? "";
  const issue = /does not exist|schema cache|42P01|PGRST205/i.test(`${msg} ${error.code}`)
    ? "supabase-schema"
    : /jwt|token|key|auth|PGRST30/i.test(`${msg} ${error.code}`)
      ? "supabase-auth"
      : "supabase-other";
  console.error("[session] Supabase error:", error);
  redirect(`/setup?issue=${issue}&detail=${encodeURIComponent(msg.slice(0, 200))}`);
}

async function linkClerkUser(
  userId: string,
): Promise<{ status: "ok"; employee: Employee } | { status: "not_registered"; email?: string } | { status: "inactive" }> {
  const clerkUser = await currentUser();
  const emails =
    clerkUser?.emailAddresses
      .filter((e) => e.verification?.status === "verified")
      .map((e) => e.emailAddress.toLowerCase()) ?? [];
  const primary = clerkUser?.primaryEmailAddress?.emailAddress;
  if (emails.length === 0) return { status: "not_registered", email: primary };

  const admin = getAdminSupabase();
  const { data: row, error: lookupError } = await admin
    .from("employees")
    .select("*")
    .in("email", emails)
    .limit(1)
    .maybeSingle<Employee>();
  if (lookupError) redirectToSetup(lookupError);

  if (!row) return { status: "not_registered", email: primary };
  if (!row.is_active) return { status: "inactive" };

  // Claim the row. The e-mail is verified by Clerk, so re-linking a row that
  // belonged to a deleted Clerk account (common while testing) is safe.
  const { data: updated, error } = await admin
    .from("employees")
    .update({ clerk_user_id: userId })
    .eq("id", row.id)
    .select("*")
    .single<Employee>();
  if (error || !updated) return { status: "not_registered", email: primary };
  return { status: "ok", employee: updated };
}

/** Use at the top of every signed-in page. Redirects if not allowed in. */
export async function requireUser(): Promise<CurrentUser> {
  const result = await lookupCurrentUser();
  if (result.status === "signed_out") redirect("/sign-in");
  if (result.status !== "ok") redirect("/not-registered");
  return result.user;
}

export async function requireHR(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isHR) redirect("/dashboard");
  return user;
}
