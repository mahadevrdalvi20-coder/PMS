"use client";

import { useFormStatus } from "react-dom";
import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from "react";
import { buttonClass, cn } from "@/components/ui";
import { RATING_SCALE } from "@/lib/format";
import type { ActionState } from "@/lib/types";

/**
 * Wraps useActionState for forms that must KEEP what the user typed when the
 * server returns a validation error. (A plain <form action> is reset by React
 * after every submit, which would wipe a half-written appraisal.)
 * The clicked button's name/value is sent too, so one form can have
 * "Save draft" and "Submit" buttons.
 */
export function useActionForm(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
) {
  const [state, formAction, pending] = useActionState(action, {});
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => formAction(data));
  };
  return { state, pending, onSubmit };
}

/** Submit button that disables itself and shows a spinner while the action runs. */
export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  name,
  value,
  confirm,
  className,
  disabled,
  pending: pendingProp,
}: {
  pending?: boolean;
  children: ReactNode;
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
  name?: string;
  value?: string;
  confirm?: string;
  className?: string;
  disabled?: boolean;
}) {
  const status = useFormStatus();
  const pending = status.pending || !!pendingProp;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      className={cn(buttonClass(variant, size), className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
}

/** Shows the result of a server action (success or error) under a form. */
export function FormMessage({ state }: { state: ActionState | undefined }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        state.error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800",
      )}
    >
      {state.error ?? state.ok}
    </p>
  );
}

export function FieldError({ state, name }: { state: ActionState | undefined; name: string }) {
  const msg = state?.fieldErrors?.[name];
  return msg ? <p className="field-error">{msg}</p> : null;
}

/** 1–5 rating picker built from radio buttons (keyboard and screen-reader friendly). */
export function RatingInput({
  name,
  defaultValue,
  disabled,
  required,
  label = "Rating",
}: {
  name: string;
  defaultValue?: number | null;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}) {
  const [value, setValue] = useState<number | null>(defaultValue ?? null);
  const selected = RATING_SCALE.find((r) => r.value === value);
  return (
    <fieldset disabled={disabled}>
      <legend className="label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </legend>
      <div className="flex gap-1.5">
        {RATING_SCALE.map((r) => (
          <label
            key={r.value}
            title={r.label}
            className={cn(
              "flex size-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition-colors has-focus-visible:ring-2 has-focus-visible:ring-brand-500",
              value === r.value ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-brand-400",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="radio"
              name={name}
              value={r.value}
              checked={value === r.value}
              onChange={() => setValue(r.value)}
              className="sr-only"
            />
            {r.value}
          </label>
        ))}
      </div>
      <p className="hint min-h-4">{selected ? selected.label : "1 = Unsatisfactory · 5 = Outstanding"}</p>
    </fieldset>
  );
}
