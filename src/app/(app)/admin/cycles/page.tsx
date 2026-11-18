import Link from "next/link";
import { getSupabase } from "@/lib/supabase/server";
import { getCycles } from "@/lib/data";
import { Card, CardHeader, EmptyState, Icon, PageHeader } from "@/components/ui";
import { CycleStatusBadge } from "@/components/status";
import { ActionButton } from "@/components/action-button";
import { formatDate } from "@/lib/format";
import { deleteCycle, setCycleStatus } from "../actions";
import { CycleForm } from "./cycle-form";

export const metadata = { title: "Review cycles" };

export default async function CyclesPage() {
  const supabase = await getSupabase();
  const cycles = await getCycles(supabase);
  const hasOpen = cycles.some((c) => c.status === "open");

  return (
    <>
      <PageHeader
        eyebrow="HR Admin"
        title="Review cycles"
        description="A cycle moves Draft → Open → Closed. Only one cycle can be open at a time; goals and appraisals can only be edited while it is open."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="All cycles" />
          {cycles.length === 0 ? (
            <EmptyState icon={<Icon name="calendar" />} title="No review cycles yet">
              Create your first cycle with the form. It starts as a draft so you can check the dates before opening it to everyone.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cycles.map((c) => (
                <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{c.name}</span>
                      <CycleStatusBadge status={c.status} />
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {formatDate(c.start_date)} – {formatDate(c.end_date)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {c.status !== "draft" && (
                      <Link href={`/admin/report?cycle=${c.id}`} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                        Report
                      </Link>
                    )}
                    {c.status === "draft" && (
                      <>
                        <ActionButton action={deleteCycle.bind(null, c.id)} variant="ghost" confirm={`Delete the draft cycle “${c.name}”?`}>
                          Delete
                        </ActionButton>
                        <ActionButton
                          action={setCycleStatus.bind(null, c.id, "open")}
                          variant="success"
                          confirm={`Open “${c.name}”? Employees will be able to set goals immediately.`}
                        >
                          {hasOpen ? "Open (close current first)" : "Open cycle"}
                        </ActionButton>
                      </>
                    )}
                    {c.status === "open" && (
                      <ActionButton
                        action={setCycleStatus.bind(null, c.id, "closed")}
                        variant="danger"
                        confirm={`Close “${c.name}”? Goals and reviews will become read-only.`}
                      >
                        Close cycle
                      </ActionButton>
                    )}
                    {c.status === "closed" && !hasOpen && (
                      <ActionButton action={setCycleStatus.bind(null, c.id, "open")} confirm={`Re-open “${c.name}”?`}>
                        Re-open
                      </ActionButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="self-start">
          <CardHeader title="New cycle" description="Created as a draft." />
          <CycleForm />
        </Card>
      </div>
    </>
  );
}
