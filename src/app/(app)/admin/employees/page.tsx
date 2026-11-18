import Link from "next/link";
import { getSupabase } from "@/lib/supabase/server";
import { Alert, Avatar, ButtonLink, Card, EmptyState, Icon, PageHeader, buttonClass } from "@/components/ui";
import { Badge } from "@/components/status";
import { formatDate } from "@/lib/format";
import type { Employee } from "@/lib/types";

export const metadata = { title: "Employees" };

const ROLE_LABEL = { employee: "Employee", manager: "Manager", hr_admin: "HR Admin" } as const;

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ q?: string; dept?: string; saved?: string; show?: string }> }) {
  const { q = "", dept = "", saved, show } = await searchParams;
  const supabase = await getSupabase();
  const { data } = await supabase.from("employees").select("*").order("full_name");
  const all = (data ?? []) as Employee[];

  const byId = new Map(all.map((e) => [e.id, e]));
  const reportCounts = new Map<string, number>();
  for (const e of all) if (e.manager_id && e.is_active) reportCounts.set(e.manager_id, (reportCounts.get(e.manager_id) ?? 0) + 1);
  const departments = Array.from(new Set(all.map((e) => e.department).filter(Boolean) as string[])).sort();

  const needle = q.toLowerCase();
  const rows = all.filter(
    (e) =>
      (show === "inactive" ? !e.is_active : show === "all" ? true : e.is_active) &&
      (!dept || e.department === dept) &&
      (!needle || [e.full_name, e.email, e.designation, e.department].some((v) => v?.toLowerCase().includes(needle))),
  );

  return (
    <>
      <PageHeader
        eyebrow="HR Admin"
        title="Employees"
        description={`${all.filter((e) => e.is_active).length} active employees across ${departments.length} departments.`}
        actions={
          <ButtonLink href="/admin/employees/new">
            <Icon name="plus" className="size-4" /> Add employee
          </ButtonLink>
        }
      />

      {saved && (
        <div className="mb-4">
          <Alert tone="success" title="Saved">
            {saved}&apos;s record has been saved.
          </Alert>
        </div>
      )}

      <Card>
        <form className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row" role="search">
          <input name="q" defaultValue={q} placeholder="Search name, e-mail, designation…" className="input sm:max-w-xs" aria-label="Search employees" />
          <select name="dept" defaultValue={dept} className="input sm:max-w-48" aria-label="Department">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select name="show" defaultValue={show ?? ""} className="input sm:max-w-40" aria-label="Status">
            <option value="">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="all">Everyone</option>
          </select>
          <button className={buttonClass("secondary")}>Filter</button>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Icon name="users" />}
            title={all.length === 0 ? "No employees yet" : "No one matches these filters"}
            action={all.length === 0 ? <ButtonLink href="/admin/employees/new">Add the first employee</ButtonLink> : <Link href="/admin/employees" className="text-sm font-semibold text-brand-700">Clear filters</Link>}
          >
            {all.length === 0 ? "Add employees and set who they report to. They can then sign in with the same e-mail." : "Try a different search or department."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="hidden px-4 py-3 md:table-cell">Department</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Manager</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Joined</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((e) => {
                  const manager = e.manager_id ? byId.get(e.manager_id) : null;
                  const reports = reportCounts.get(e.id) ?? 0;
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={e.full_name} />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900">{e.full_name}</div>
                            <div className="truncate text-xs text-slate-500">{e.designation ?? "—"}</div>
                            <div className="truncate text-xs text-slate-400">{e.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-700 md:table-cell">{e.department ?? "—"}</td>
                      <td className="hidden px-4 py-3 text-slate-700 sm:table-cell">{manager?.full_name ?? <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={e.role === "hr_admin" ? "violet" : e.role === "manager" ? "blue" : "gray"}>{ROLE_LABEL[e.role]}</Badge>
                          {reports > 0 && <Badge tone="blue">{reports} report{reports > 1 ? "s" : ""}</Badge>}
                          {!e.is_active && <Badge tone="red">Inactive</Badge>}
                          {e.is_active && !e.clerk_user_id && <Badge tone="amber">Not signed in yet</Badge>}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{formatDate(e.date_of_joining)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/employees/${e.id}`} className="font-semibold text-brand-700 hover:text-brand-900">
                          Edit<span className="sr-only"> {e.full_name}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
