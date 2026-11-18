import Link from "next/link";
import { getSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { Card, EmptyState, Icon, PageHeader } from "@/components/ui";
import { CycleStatusBadge, RatingPill, ReviewStatusBadge } from "@/components/status";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Review, ReviewCycle } from "@/lib/types";

export const metadata = { title: "Review History" };

export default async function HistoryPage() {
  const me = await requireUser();
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("reviews")
    .select("*, cycle:review_cycles(*)")
    .eq("employee_id", me.id)
    .order("created_at", { ascending: false });
  const reviews = (data ?? []) as (Review & { cycle: ReviewCycle })[];

  return (
    <>
      <PageHeader title="Review History" description="Every appraisal you have taken part in, newest first — useful for promotion conversations." />
      <Card>
        {reviews.length === 0 ? (
          <EmptyState icon={<Icon name="history" />} title="No reviews yet">
            Your reviews will be listed here once you start a self-appraisal.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reviews.map((r) => (
              <li key={r.id}>
                <Link href={`/reviews/${r.id}`} className="flex flex-col gap-3 px-5 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{r.cycle.name}</span>
                      <CycleStatusBadge status={r.cycle.status} />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(r.cycle.start_date)} – {formatDate(r.cycle.end_date)}
                      {r.completed_at && ` · Completed ${formatDateTime(r.completed_at)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ReviewStatusBadge status={r.status} />
                    {r.status === "completed" && <RatingPill value={r.overall_manager_rating} />}
                    <Icon name="arrow" className="size-4 text-slate-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
