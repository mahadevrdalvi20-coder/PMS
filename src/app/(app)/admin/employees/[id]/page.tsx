import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/server";
import { getActiveEmployees, getEmployee } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { EmployeeForm } from "../employee-form";

export const metadata = { title: "Edit employee" };

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabase();
  const [employee, employees] = await Promise.all([getEmployee(supabase, id), getActiveEmployees(supabase)]);
  if (!employee) notFound();

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean) as string[]));

  return (
    <>
      <PageHeader
        eyebrow="HR Admin · Employees"
        title={employee.full_name}
        description={
          <>
            Edit details, reporting line and access.{" "}
            <Link href={`/team/${employee.id}`} className="font-semibold text-brand-700">
              Open their current appraisal →
            </Link>
          </>
        }
      />
      <EmployeeForm employee={employee} managers={employees} departments={departments} />
    </>
  );
}
