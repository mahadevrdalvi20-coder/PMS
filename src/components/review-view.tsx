import { Card, CardHeader, Icon } from "@/components/ui";
import { RatingPill } from "@/components/status";
import { weightedScore } from "@/lib/format";
import type { Goal, GoalRating, Review } from "@/lib/types";

/**
 * Read-only appraisal: each goal with the employee's self-assessment next to
 * the manager's. `showManager` is false for an employee whose review is not
 * yet completed — they should not see a half-written manager rating.
 */
export function ReviewView({
  goals,
  ratings,
  review,
  showManager,
}: {
  goals: Goal[];
  ratings: Map<string, GoalRating>;
  review: Review;
  showManager: boolean;
}) {
  const selfScore = weightedScore(goals.map((g) => ({ weightage: g.weightage, rating: ratings.get(g.id)?.self_rating })));
  const mgrScore = weightedScore(goals.map((g) => ({ weightage: g.weightage, rating: ratings.get(g.id)?.manager_rating })));

  return (
    <div className="space-y-4">
      {goals.map((g, i) => {
        const r = ratings.get(g.id);
        return (
          <Card key={g.id}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex min-w-0 gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{g.title}</h3>
                  {g.description && <p className="mt-0.5 text-sm text-slate-500">{g.description}</p>}
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-800">{Number(g.weightage)}%</span>
            </div>
            <div className={`grid divide-y divide-slate-100 ${showManager ? "md:grid-cols-2 md:divide-x md:divide-y-0" : ""}`}>
              <div className="p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Self-assessment</span>
                  <RatingPill value={r?.self_rating} />
                </div>
                <p className="text-sm whitespace-pre-line text-slate-700">{r?.self_comment || <span className="text-slate-400">No comment</span>}</p>
              </div>
              {showManager && (
                <div className="bg-slate-50/50 p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Manager</span>
                    <RatingPill value={r?.manager_rating} />
                  </div>
                  <p className="text-sm whitespace-pre-line text-slate-700">{r?.manager_comment || <span className="text-slate-400">No comment yet</span>}</p>
                </div>
              )}
            </div>
          </Card>
        );
      })}

      <Card>
        <CardHeader title="Overall" />
        <div className={`grid divide-y divide-slate-100 ${showManager ? "md:grid-cols-2 md:divide-x md:divide-y-0" : ""}`}>
          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Self rating</span>
              <RatingPill value={review.overall_self_rating} />
            </div>
            {selfScore != null && <ScoreLine label="Weighted goal score" value={selfScore} />}
            {review.self_summary && <p className="text-sm whitespace-pre-line text-slate-700">{review.self_summary}</p>}
          </div>
          {showManager && (
            <div className="space-y-3 bg-slate-50/50 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Final manager rating</span>
                <RatingPill value={review.overall_manager_rating} />
              </div>
              {mgrScore != null && <ScoreLine label="Weighted goal score" value={mgrScore} />}
              {review.manager_summary && <p className="text-sm whitespace-pre-line text-slate-700">{review.manager_summary}</p>}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function ScoreLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Icon name="activity" className="size-3.5" />
      {label}: <span className="font-semibold text-slate-800 tabular-nums">{value.toFixed(2)} / 5</span>
    </div>
  );
}
