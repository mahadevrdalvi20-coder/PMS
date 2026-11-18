import Link from "next/link";
import { getSupabase } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { getAppraisal, getOpenCycle } from "@/lib/data";
import { Alert, ButtonLink, Card, EmptyState, Icon, PageHeader } from "@/components/ui";
import { ReviewStatusBadge, ReviewStepper } from "@/components/status";
import { ReviewView } from "@/components/review-view";
import { formatDateTime, goalStage, reviewStatusOf } from "@/lib/format";
import { SelfAppraisalForm } from "./self-appraisal-form";

export const metadata = { title: "My Review" };

export default async function MyReviewPage() {
  const me = await requireUser();
  const supabase = await getSupabase();
  const cycle = await getOpenCycle(supabase);

  if (!cycle) {
    return (
      <>
        <PageHeader title="My Review" />
        <Card>
          <EmptyState icon={<Icon name="clipboard" />} title="No review cycle is open" action={<ButtonLink href="/history" variant="secondary">View past reviews</ButtonLink>}>
            Your self-appraisal opens here when HR starts the next cycle.
          </EmptyState>
        </Card>
      </>
    );
  }

  const { goals, review, ratings } = await getAppraisal(supabase, me.id, cycle.id);
  const status = reviewStatusOf(review);
  const stage = goalStage(goals);

  return (
    <>
      <PageHeader
        eyebrow={cycle.name}
        title="My Review"
        description="Rate yourself against each approved goal, then submit. Your manager will see your ratings side by side with theirs."
        actions={<ReviewStatusBadge status={status} />}
      />

      <Card className="mb-6 p-5">
        <ReviewStepper status={status} />
      </Card>

      {stage !== "approved" ? (
        <Card>
          <EmptyState
            icon={<Icon name="target" />}
            title="Your goals need to be approved first"
            action={<ButtonLink href="/goals">Go to My Goals</ButtonLink>}
          >
            The self-appraisal is written against approved goals. Set your goals (totalling 100%) and get your manager&apos;s approval to unlock it.
          </EmptyState>
        </Card>
      ) : status === "not_started" ? (
        <SelfAppraisalForm goals={goals} ratings={Object.fromEntries(ratings)} review={review} />
      ) : (
        <>
          <div className="mb-4">
            {status === "completed" ? (
              <Alert tone="success" title="Your review is complete">
                Completed on {formatDateTime(review!.completed_at)}. Your manager&apos;s ratings and comments are shown below.
              </Alert>
            ) : (
              <Alert tone="info" title="Submitted — waiting for your manager">
                You submitted on {formatDateTime(review!.submitted_at)}. Your manager&apos;s ratings will appear here when the review is completed.{" "}
                <Link href="/dashboard" className="font-semibold underline">Back to dashboard</Link>
              </Alert>
            )}
          </div>
          <ReviewView goals={goals} ratings={ratings} review={review!} showManager={status === "completed"} />
        </>
      )}
    </>
  );
}
