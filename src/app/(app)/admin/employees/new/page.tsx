import { getSupabase } from "@/lib/supabase/server";
import { getActiveEmployees } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { EmployeeForm } from "../employee-form";

export const metadata = { title: "Add employee" };

export default async function NewEmployeePage() {
  const supabase = await getSupabase();
  const employees = await getActiveEmployees(supabase);
  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean) as string[]));

  return (
    <>
      <PageHeader eyebrow="HR Admin · Employees" title="Add employee" description="Create the record first — the person can then sign in with the same e-mail." />
      <EmployeeForm managers={employees} departments={departments} />
    </>
  );
}
