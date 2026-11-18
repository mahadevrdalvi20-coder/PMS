"use client";

import { FieldError, FormMessage, RatingInput, SubmitButton, useActionForm } from "@/components/forms";
import { Card, CardHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { saveSelfAppraisal } from "./actions";
import type { Goal, GoalRating, Review } from "@/lib/types";

export function SelfAppraisalForm({
  goals,
  ratings,
  review,
}: {
  goals: Goal[];
  ratings: Record<string, GoalRating>;
  review: Review | null;
}) {
  const { state, pending, onSubmit } = useActionForm(saveSelfAppraisal);

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
                  <p className="mt-1 text-xs text-slate-400">Target {formatDate(g.target_date)}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-800">{Number(g.weightage)}%</span>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-[auto_1fr]">
              <div>
                <RatingInput name={`rating_${g.id}`} defaultValue={r?.self_rating} required label="Self-rating" />
                <FieldError state={state} name={`rating_${g.id}`} />
              </div>
              <div>
                <label className="label" htmlFor={`comment_${g.id}`}>
                  What did you achieve? <span className="text-red-600">*</span>
                </label>
                <textarea
                  id={`comment_${g.id}`}
                  name={`comment_${g.id}`}
                  rows={4}
                  className="input"
                  defaultValue={r?.self_comment ?? ""}
                  placeholder="Evidence against the goal: outcomes, numbers, examples, and anything that got in the way."
                />
                <FieldError state={state} name={`comment_${g.id}`} />
              </div>
            </div>
          </Card>
        );
      })}

      <Card>
        <CardHeader title="Overall self-assessment" description="Your overall view of the year, across all goals." />
        <div className="grid gap-5 p-5 md:grid-cols-[auto_1fr]">
          <div>
            <RatingInput name="overall_rating" defaultValue={review?.overall_self_rating} required label="Overall rating" />
            <FieldError state={state} name="overall_rating" />
          </div>
          <div>
            <label className="label" htmlFor="summary">Summary (optional)</label>
            <textarea
              id="summary"
              name="summary"
              rows={4}
              className="input"
              defaultValue={review?.self_summary ?? ""}
              placeholder="Highlights, what you learned, and the support you need next year."
            />
          </div>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:flex-1">
            <FormMessage state={state} />
            {!state.error && !state.ok && <p className="text-xs text-slate-500">Save a draft any time. Once submitted, your self-appraisal is locked.</p>}
          </div>
          <div className="flex gap-2">
            <SubmitButton pending={pending} variant="secondary" name="intent" value="draft">
              Save draft
            </SubmitButton>
            <SubmitButton
              pending={pending}
              name="intent"
              value="submit"
              confirm="Submit your self-appraisal? You won't be able to change it afterwards."
            >
              Submit self-appraisal
            </SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}
