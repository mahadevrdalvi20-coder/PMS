"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/forms";
import type { ActionState } from "@/lib/types";

/**
 * A one-button form for a single server action (Open cycle, Approve, Delete…),
 * with an optional confirm() and an inline error message.
 */
export function ActionButton({
  action,
  children,
  variant = "secondary",
  size = "sm",
  confirm,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md";
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="inline-flex flex-col items-end">
      <SubmitButton variant={variant} size={size} confirm={confirm}>
        {children}
      </SubmitButton>
      {state.error && (
        <p role="alert" className="mt-1 max-w-56 text-right text-xs font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
