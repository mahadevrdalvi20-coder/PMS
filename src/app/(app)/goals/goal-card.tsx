"use client";

import { useCallback, useState } from "react";
import { Card, Icon, buttonClass } from "@/components/ui";
import { GoalStatusBadge } from "@/components/status";
import { ActionButton } from "@/components/action-button";
import { formatDate } from "@/lib/format";
import { deleteGoal } from "./actions";
import { GoalForm } from "./goal-form";
import type { Goal } from "@/lib/types";

export function GoalCard({
  goal,
  index,
  totalWeight,
  minDate,
  maxDate,
  editable,
}: {
  goal: Goal;
  index: number;
  totalWeight: number;
  minDate: string;
  maxDate: string;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);
  const canEdit = editable && (goal.status === "draft" || goal.status === "sent_back");

  return (
    <Card className={goal.status === "sent_back" ? "border-red-200" : undefined}>
      <div className="p-5">
        {editing ? (
          <GoalForm goal={goal} otherWeight={totalWeight - Number(goal.weightage)} minDate={minDate} maxDate={maxDate} onDone={close} />
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{goal.title}</h3>
                  {goal.description && <p className="mt-1 text-sm whitespace-pre-line text-slate-600">{goal.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                    <GoalStatusBadge status={goal.status} />
                    <span className="inline-flex items-center gap-1">
                      <Icon name="calendar" className="size-3.5" /> Target {formatDate(goal.target_date)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xl font-bold text-brand-700 tabular-nums">{Number(goal.weightage)}%</div>
                <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">weight</div>
              </div>
            </div>

            {goal.manager_comment && (
              <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${goal.status === "sent_back" ? "border-red-200 bg-red-50 text-red-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                <span className="font-semibold">Manager&apos;s comment: </span>
                {goal.manager_comment}
              </div>
            )}

            {canEdit && (
              <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <ActionButton action={deleteGoal.bind(null, goal.id)} variant="ghost" confirm={`Delete “${goal.title}”?`}>
                  <Icon name="trash" className="size-3.5" /> Delete
                </ActionButton>
                <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", "sm")}>
                  <Icon name="edit" className="size-3.5" /> Edit
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
