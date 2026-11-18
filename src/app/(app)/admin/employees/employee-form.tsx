"use client";

import Link from "next/link";
import { FieldError, FormMessage, SubmitButton, useActionForm } from "@/components/forms";
import { buttonClass, Card } from "@/components/ui";
import { saveEmployee } from "../actions";
import type { Employee } from "@/lib/types";

const DEPARTMENTS = ["Engineering", "Product", "Design", "Sales", "Marketing", "Operations", "Finance", "People", "Customer Success"];

export function EmployeeForm({
  employee,
  managers,
  departments,
}: {
  employee?: Employee;
  managers: Pick<Employee, "id" | "full_name" | "designation">[];
  departments: string[];
}) {
  const { state, pending, onSubmit } = useActionForm(saveEmployee);
  const deptOptions = Array.from(new Set([...DEPARTMENTS, ...departments])).sort();

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card className="p-5 sm:p-6">
        {employee && <input type="hidden" name="id" value={employee.id} />}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="full_name">Full name *</label>
            <input id="full_name" name="full_name" className="input" defaultValue={employee?.full_name} required autoComplete="off" />
            <FieldError state={state} name="full_name" />
          </div>
          <div>
            <label className="label" htmlFor="email">Work e-mail *</label>
            <input id="email" name="email" type="email" className="input" defaultValue={employee?.email} required autoComplete="off" />
            <p className="hint">They must sign in with this exact e-mail.</p>
            <FieldError state={state} name="email" />
          </div>
          <div>
            <label className="label" htmlFor="designation">Designation *</label>
            <input id="designation" name="designation" className="input" defaultValue={employee?.designation ?? ""} placeholder="e.g. Software Engineer" />
            <FieldError state={state} name="designation" />
          </div>
          <div>
            <label className="label" htmlFor="department">Department *</label>
            <input id="department" name="department" list="departments" className="input" defaultValue={employee?.department ?? ""} placeholder="e.g. Engineering" />
            <datalist id="departments">
              {deptOptions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <FieldError state={state} name="department" />
          </div>
          <div>
            <label className="label" htmlFor="date_of_joining">Date of joining *</label>
            <input id="date_of_joining" name="date_of_joining" type="date" className="input" defaultValue={employee?.date_of_joining ?? ""} />
            <FieldError state={state} name="date_of_joining" />
          </div>
          <div>
            <label className="label" htmlFor="manager_id">Reports to</label>
            <select id="manager_id" name="manager_id" className="input" defaultValue={employee?.manager_id ?? ""}>
              <option value="">— No manager (top of hierarchy) —</option>
              {managers
                .filter((m) => m.id !== employee?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                    {m.designation ? ` — ${m.designation}` : ""}
                  </option>
                ))}
            </select>
            <p className="hint">Stored as a link to the manager&apos;s record, so renames never break it.</p>
            <FieldError state={state} name="manager_id" />
          </div>
          <div>
            <label className="label" htmlFor="role">Access role *</label>
            <select id="role" name="role" className="input" defaultValue={employee?.role ?? "employee"}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="hr_admin">HR Admin</option>
            </select>
            <p className="hint">Anyone with direct reports automatically gets the manager view.</p>
            <FieldError state={state} name="role" />
          </div>
          {employee && (
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:self-end">
              <input id="is_active" name="is_active" type="checkbox" defaultChecked={employee.is_active} className="mt-0.5 size-4 accent-brand-700" />
              <label htmlFor="is_active" className="text-sm">
                <span className="font-medium text-slate-900">Active</span>
                <span className="block text-xs text-slate-500">Inactive employees cannot sign in and are hidden from reports.</span>
              </label>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:flex-1">
            <FormMessage state={state} />
          </div>
          <div className="flex gap-2">
            <Link href="/admin/employees" className={buttonClass("secondary")}>Cancel</Link>
            <SubmitButton pending={pending}>{employee ? "Save changes" : "Add employee"}</SubmitButton>
          </div>
        </div>
      </Card>
    </form>
  );
}
