"use client";

import { useMemo, useState } from "react";
import { FieldError, FormMessage, SubmitButton, useActionForm } from "@/components/forms";
import { Icon, buttonClass } from "@/components/ui";
import { decideGoal } from "../actions";

/** Approve a submitted goal, or send it back with a (required) comment. */
export function GoalDecision({ goalId }: { goalId: string }) {
  const { state, pending, onSubmit } = useActionForm(useMemo(() => decideGoal.bind(null, goalId), [goalId]));
  const [sendingBack, setSendingBack] = useState(false);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      {sendingBack && (
        <div>
          <label className="label" htmlFor={`comment-${goalId}`}>
            What should change? <span className="text-red-600">*</span>
          </label>
          <textarea
            id={`comment-${goalId}`}
            name="comment"
            rows={2}
            className="input"
            autoFocus
            placeholder="e.g. Make this measurable — what number will tell us it's done?"
          />
          <FieldError state={state} name="comment" />
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {sendingBack ? (
          <>
            <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setSendingBack(false)}>
              Cancel
            </button>
            <SubmitButton pending={pending} name="decision" value="sent_back" variant="danger" size="sm">
              Send back
            </SubmitButton>
          </>
        ) : (
          <>
            <button type="button" className={buttonClass("danger", "sm")} onClick={() => setSendingBack(true)}>
              <Icon name="x" className="size-3.5" /> Send back
            </button>
            <SubmitButton pending={pending} name="decision" value="approved" variant="success" size="sm">
              <Icon name="check" className="size-3.5" /> Approve
            </SubmitButton>
          </>
        )}
      </div>
      {state.error && <FormMessage state={{ error: state.error }} />}
    </form>
  );
}
