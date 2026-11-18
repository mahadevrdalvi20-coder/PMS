"use client";

import { useEffect, useRef, useState } from "react";
import { FieldError, FormMessage, SubmitButton, useActionForm } from "@/components/forms";
import { buttonClass } from "@/components/ui";
import { saveGoal } from "./actions";
import type { Goal } from "@/lib/types";

/** Add / edit a goal. Shows the running weightage total while typing. */
export function GoalForm({
  goal,
  otherWeight,
  minDate,
  maxDate,
  onDone,
}: {
  goal?: Goal;
  otherWeight: number;
  minDate: string;
  maxDate: string;
  onDone?: () => void;
}) {
  const { state, pending, onSubmit } = useActionForm(saveGoal);
  const [weight, setWeight] = useState(goal ? String(goal.weightage) : "");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    if (goal) onDone?.();
    else formRef.current?.reset(); // fires onReset below, which clears the weight
  }, [state, goal, onDone]);

  const n = Number(weight);
  const total = Math.round((otherWeight + (Number.isFinite(n) ? n : 0)) * 100) / 100;
  const remaining = Math.round((100 - otherWeight) * 100) / 100;

  return (
    <form ref={formRef} onSubmit={onSubmit} onReset={() => setWeight("")} noValidate className="space-y-4">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <div>
        <label className="label" htmlFor={`title-${goal?.id ?? "new"}`}>Goal title *</label>
        <input
          id={`title-${goal?.id ?? "new"}`}
          name="title"
          className="input"
          defaultValue={goal?.title}
          placeholder="e.g. Reduce average ticket resolution time to under 24 hours"
          maxLength={140}
        />
        <FieldError state={state} name="title" />
      </div>
      <div>
        <label className="label" htmlFor={`desc-${goal?.id ?? "new"}`}>Description & success measure *</label>
        <textarea
          id={`desc-${goal?.id ?? "new"}`}
          name="description"
          rows={3}
          className="input"
          defaultValue={goal?.description ?? ""}
          placeholder="Specific, measurable, achievable, relevant, time-bound. How will you and your manager know it is done?"
        />
        <FieldError state={state} name="description" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`weight-${goal?.id ?? "new"}`}>Weightage (%) *</label>
          <input
            id={`weight-${goal?.id ?? "new"}`}
            name="weightage"
            type="number"
            inputMode="decimal"
            min={1}
            max={100}
            step="0.01"
            className="input"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={remaining > 0 ? String(remaining) : "0"}
          />
          <p className={total > 100 ? "field-error" : "hint"}>
            {weight === "" ? `${remaining}% still unallocated` : `Total with this goal: ${total}%`}
          </p>
          <FieldError state={state} name="weightage" />
        </div>
        <div>
          <label className="label" htmlFor={`target-${goal?.id ?? "new"}`}>Target date *</label>
          <input
            id={`target-${goal?.id ?? "new"}`}
            name="target_date"
            type="date"
            min={minDate}
            max={maxDate}
            className="input"
            defaultValue={goal?.target_date ?? ""}
          />
          <FieldError state={state} name="target_date" />
        </div>
      </div>
      <FormMessage state={state} />
      <div className="flex justify-end gap-2">
        {onDone && (
          <button type="button" onClick={onDone} className={buttonClass("secondary")}>
            Cancel
          </button>
        )}
        <SubmitButton pending={pending}>{goal ? "Save goal" : "Add goal"}</SubmitButton>
      </div>
    </form>
  );
}
