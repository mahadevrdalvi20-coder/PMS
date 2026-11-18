import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { byGoal, getCycle, getEmployee, getGoalRatings, getGoals } from "@/lib/data";
import { Alert, Card, PageHeader } from "@/components/ui";
import { ReviewStatusBadge, ReviewStepper } from "@/components/status";
import { ReviewView } from "@/components/review-view";
import type { Review } from "@/lib/types";

export const metadata = { title: "Review" };

/**
 * Read-only review by id. Try opening someone else's review id here: Row Level
 * Security returns no row, so the page shows 404 — the URL alone grants nothing.
 */
export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const supabase = await getSupabase();

  const { data: review } = await supabase.from("reviews").select("*").eq("id", id).maybeSingle<Review>();
  if (!review) notFound();

  const [employee, cycle, goals, ratings] = await Promise.all([
    getEmployee(supabase, review.employee_id),
    getCycle(supabase, review.cycle_id),
    getGoals(supabase, review.employee_id, review.cycle_id),
    getGoalRatings(supabase, review.id),
  ]);
  if (!employee || !cycle) notFound();

  const isSelf = employee.id === me.id;
  // Employees see their manager's ratings only once the review is completed.
  const showManager = !isSelf || review.status === "completed";

  return (
    <>
      <PageHeader
        eyebrow={<Link href={isSelf ? "/history" : `/team/${employee.id}`} className="hover:underline">← {isSelf ? "Review history" : employee.full_name}</Link>}
        title={`${cycle.name} review`}
        description={isSelf ? "Your appraisal" : `${employee.full_name} · ${employee.designation ?? ""}`}
        actions={<ReviewStatusBadge status={review.status} />}
      />
      <Card className="mb-6 p-5">
        <ReviewStepper status={review.status} />
      </Card>
      {review.status === "not_started" ? (
        <Alert tone="info" title="Self-appraisal not submitted yet" />
      ) : (
        <ReviewView goals={goals} ratings={byGoal(ratings)} review={review} showManager={showManager} />
      )}
    </>
  );
}
