"use client";

import { useMemo } from "react";
import { FieldError, FormMessage, RatingInput, SubmitButton, useActionForm } from "@/components/forms";
import { Card, CardHeader } from "@/components/ui";
import { RatingPill } from "@/components/status";
import { saveManagerReview } from "../actions";
import type { Goal, GoalRating, Review } from "@/lib/types";

/**
 * Manager's review screen: the employee's self-appraisal on the LEFT,
 * the manager's own rating and comment on the RIGHT, goal by goal.
 */
export function ManagerReviewForm({
  review,
  goals,
  ratings,
  employeeName,
}: {
  review: Review;
  goals: Goal[];
  ratings: Record<string, GoalRating>;
  employeeName: string;
}) {
  const { state, pending, onSubmit } = useActionForm(useMemo(() => saveManagerReview.bind(null, review.id), [review.id]));
  const firstName = employeeName.split(" ")[0];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {goals.map((g, i) => {
        const r = ratings[g.id];
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
            <div className="grid divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="bg-slate-50/60 p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{firstName}&apos;s self-assessment</span>
                  <RatingPill value={r?.self_rating} />
                </div>
                <p className="text-sm whitespace-pre-line text-slate-700">{r?.self_comment || <span className="text-slate-400">No comment</span>}</p>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <RatingInput name={`rating_${g.id}`} defaultValue={r?.manager_rating} required label="Your rating" />
                  <FieldError state={state} name={`rating_${g.id}`} />
                </div>
                <div>
                  <label className="label" htmlFor={`comment_${g.id}`}>
                    Your comment <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id={`comment_${g.id}`}
                    name={`comment_${g.id}`}
                    rows={3}
                    className="input"
                    defaultValue={r?.manager_comment ?? ""}
                    placeholder="Specific evidence for your rating — what went well, what could be better."
                  />
                  <FieldError state={state} name={`comment_${g.id}`} />
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      <Card>
        <CardHeader title="Overall rating" description="Your final, holistic assessment. This is the rating HR reports on." />
        <div className="grid divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="space-y-2 bg-slate-50/60 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{firstName}&apos;s overall self-rating</span>
              <RatingPill value={review.overall_self_rating} />
            </div>
            {review.self_summary && <p className="text-sm whitespace-pre-line text-slate-700">{review.self_summary}</p>}
          </div>
          <div className="space-y-4 p-5">
            <div>
              <RatingInput name="overall_rating" defaultValue={review.overall_manager_rating} required label="Overall rating" />
              <FieldError state={state} name="overall_rating" />
            </div>
            <div>
              <label className="label" htmlFor="summary">
                Summary <span className="text-red-600">*</span>
              </label>
              <textarea
                id="summary"
                name="summary"
                rows={4}
                className="input"
                defaultValue={review.manager_summary ?? ""}
                placeholder="Key strengths, development areas and focus for next cycle."
              />
              <FieldError state={state} name="summary" />
            </div>
          </div>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:flex-1">
            <FormMessage state={state} />
            {!state.error && !state.ok && <p className="text-xs text-slate-500">{firstName} cannot see your ratings until you complete the review.</p>}
          </div>
          <div className="flex gap-2">
            <SubmitButton pending={pending} variant="secondary" name="intent" value="draft">
              Save draft
            </SubmitButton>
            <SubmitButton pending={pending} name="intent" value="submit">
              Submit review
            </SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}
