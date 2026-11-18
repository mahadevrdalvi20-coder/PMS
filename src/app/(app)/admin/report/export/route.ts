import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase/server";
import { lookupCurrentUser } from "@/lib/session";
import { getCycle } from "@/lib/data";
import { buildCycleReport } from "@/lib/report";
import { GOAL_STAGE_LABEL, REVIEW_STATUS_LABEL, ratingLabel } from "@/lib/format";

/** GET /admin/report/export?cycle=… → CSV download of the completion report (HR only). */
export async function GET(req: NextRequest) {
  const me = await lookupCurrentUser();
  if (me.status !== "ok" || !me.user.isHR) return new NextResponse("Forbidden", { status: 403 });

  const params = req.nextUrl.searchParams;
  const supabase = await getSupabase();
  const cycle = await getCycle(supabase, params.get("cycle") ?? "");
  if (!cycle) return new NextResponse("Cycle not found", { status: 404 });

  const status = params.get("status");
  const dept = params.get("dept");
  const rows = (await buildCycleReport(supabase, cycle.id)).filter(
    (r) => (!status || r.status === status) && (!dept || r.employee.department === dept),
  );

  const header = ["Employee", "Email", "Designation", "Department", "Manager", "Goals", "Total weightage", "Goal status", "Review status", "Self rating", "Final rating", "Final rating label", "Completed at"];
  const lines = rows.map((r) => [
    r.employee.full_name,
    r.employee.email,
    r.employee.designation ?? "",
    r.employee.department ?? "",
    r.manager?.full_name ?? "",
    r.goalCount,
    r.weight,
    GOAL_STAGE_LABEL[r.stage],
    REVIEW_STATUS_LABEL[r.status],
    r.review?.status !== "not_started" ? (r.review?.overall_self_rating ?? "") : "",
    r.review?.overall_manager_rating ?? "",
    r.review?.overall_manager_rating ? ratingLabel(r.review.overall_manager_rating) : "",
    r.review?.completed_at ?? "",
  ]);

  // Quote every cell; neutralise leading = + - @ so Excel never runs a formula from user data.
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = "﻿" + [header, ...lines].map((l) => l.map(cell).join(",")).join("\r\n");
  const filename = `${cycle.name.replace(/[^\w\-]+/g, "_")}_completion.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
