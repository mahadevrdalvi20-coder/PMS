"use client";

import { useEffect, useRef } from "react";
import { FieldError, FormMessage, SubmitButton, useActionForm } from "@/components/forms";
import { createCycle } from "../actions";

export function CycleForm() {
  const { state, pending, onSubmit } = useActionForm(createCycle);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4 p-5">
      <div>
        <label className="label" htmlFor="name">Cycle name *</label>
        <input id="name" name="name" className="input" placeholder="FY 2026–27 Annual" />
        <FieldError state={state} name="name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="start_date">Start date *</label>
          <input id="start_date" name="start_date" type="date" className="input" />
          <FieldError state={state} name="start_date" />
        </div>
        <div>
          <label className="label" htmlFor="end_date">End date *</label>
          <input id="end_date" name="end_date" type="date" className="input" />
          <FieldError state={state} name="end_date" />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="w-full">Create cycle</SubmitButton>
    </form>
  );
}
