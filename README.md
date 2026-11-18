# Stride — Performance Management System

A web app that lets HR run a performance cycle end to end: employees set weighted goals and complete a self-appraisal, managers approve goals and review their direct reports side by side, and HR tracks completion across the company — with the whole record stored, searchable and auditable.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4) · Clerk (auth) · Supabase Postgres (data + Row Level Security) · Resend (e-mail) · Vercel (hosting)

- 📄 [Research note](RESEARCH.md) — the HR process, and why every field exists
- 🗺️ [Data model](docs/data-model.md) — ER diagram + status state machines
- 🖼️ [Screen map](docs/screens.md)

---

## Features

| Module | What works |
|---|---|
| Authentication | Clerk sign-up / sign-in. On first login the Clerk user is linked to the employee row with the same **verified** e-mail. |
| Roles | Employee, Manager, HR Admin. Navigation and data change by role. A "manager" is any employee with direct reports. |
| Employee directory | HR adds/edits employees: name, e-mail, designation, department, date of joining, manager, role, active flag. Reporting loops are blocked. |
| Review cycles | HR creates cycles (Draft) and opens / closes them. Only one cycle can be open. |
| Goals | Title, description, weightage, target date. Live weightage total; **must equal 100%** to submit. |
| Goal approval | Manager approves, or sends back with a **required** comment. `Draft → Submitted → Approved / Sent Back`. |
| Self-appraisal | Rating (1–5) + achievement comment per approved goal, overall rating, summary. Save draft / submit. |
| Manager review | Self-appraisal on the left, manager input on the right, goal by goal; overall rating + summary; weighted score. |
| Status workflow | `Not Started → Self-Appraisal Submitted → Manager Reviewed → Completed`, shown on every screen. |
| Dashboards | Employee: own progress & next step. Manager: team completion & to-do. HR: company pipeline & recent activity. |
| Completion report | Filter by cycle / status / department, rating distribution, **CSV export**. |
| E-mail | Manager is e-mailed when goals or a self-appraisal are submitted; employee when goals are decided and the review is completed. |
| Audit trail | Every status change is logged by a database trigger. |

### Security model (defence in depth)

1. **Proxy** (`src/proxy.ts`) — signed-out visitors are redirected to sign-in.
2. **Pages** (`src/lib/session.ts`) — every page resolves the Clerk user to an *employee*; admin pages require HR.
3. **Database** (`supabase/schema.sql`) — every query runs with the user's Clerk token, so **Row Level Security** decides what comes back. Employee A opening `/reviews/<B's id>` gets a 404 because the database returns no row. **Triggers** enforce the workflow (no approving your own goals, no editing a submitted appraisal, comments required, etc.).
4. **Secrets** — `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` are only read in `server-only` modules.

Run the automated RLS + workflow tests (in-memory Postgres, no setup needed):

```bash
npm run test:db
```

---

## Setup

### 1. Install

```bash
npm install
```

```bash
cp .env.example .env.local
```

### 2. Clerk

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com) with **Email** sign-in.
2. Copy the publishable and secret keys into `.env.local`.

### 3. Supabase

1. Create a project at [supabase.com](https://supabase.com). From **Project Settings → API** copy the Project URL, the anon (publishable) key and the **service_role** key into `.env.local`.
2. **Connect Clerk to Supabase** (this is what makes RLS work with Clerk users):
   - In Clerk: open **Integrations → Supabase** (or [dashboard.clerk.com/setup/supabase](https://dashboard.clerk.com/setup/supabase)), activate it and copy the **Clerk domain** shown.
   - In Supabase: **Authentication → Sign In / Providers → Third-Party Auth → Add provider → Clerk**, paste the domain.
3. Open **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql).
4. Edit the e-mails in [`supabase/seed.sql`](supabase/seed.sql) to inboxes you can sign in with (Gmail `+` aliases work: `you+hr@gmail.com`, `you+mgr@gmail.com`, `you+emp@gmail.com`), then run it. You need **at least one HR admin** in the table before anyone can use the app.

### 4. Resend

1. Create an API key at [resend.com](https://resend.com) and put it in `RESEND_API_KEY`.
2. On the free plan keep `EMAIL_FROM=Stride PMS <onboarding@resend.dev>`. Resend's test sender **only delivers to the e-mail address you signed up to Resend with** — use that address for the manager in your demo.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

### 6. Deploy to Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Add **every** variable from `.env.local` under **Settings → Environment Variables**, set `NEXT_PUBLIC_APP_URL` to your Vercel URL, and redeploy.
3. In Clerk, add the Vercel domain to the allowed origins (development instances accept any origin).

### Troubleshooting

| Symptom | Fix |
|---|---|
| Every page shows **"Setup required"** | Environment variables are missing in Vercel. Add the ones marked ✗, then **Deployments → ⋯ → Redeploy**. |
| "Supabase rejected the signed-in user's token" | Connect Clerk to Supabase (step 3.2 above). |
| "The database tables do not exist yet" | Run `supabase/schema.sql` in the Supabase SQL Editor. |
| "Your account is not yet set up" after sign-in | Your e-mail is not in the `employees` table — run `seed.sql` with your e-mail, or have HR add you. |
| Vercel build fails | Open the build log; run `npm run build` locally to reproduce. |

---

## Demo script (Definition of Done)

1. Sign in as **HR** → *Review Cycles* → create "FY 2026–27 Annual" → **Open cycle**.
2. *Employees* → **Add employee** → choose their **Reports to** manager.
3. Sign in as that **employee** → *My Goals* → add three goals totalling **100%** → **Submit for approval**. (Try 90% first to show the validation.)
4. Sign in as the **manager** → *My Team* → open the employee → **Approve** (or *Send back* with a comment).
5. Sign in as the **employee** → *My Review* → rate and comment on each goal → **Submit self-appraisal**.
6. Check the manager's inbox for *"… submitted their self-appraisal"*.
7. Sign in as the **manager** → open the employee → fill in the right-hand column, overall rating, summary → **Submit review** → **Complete review**.
8. Sign in as **HR** → *Completion Report* → the employee shows **Completed**.

Security check: as employee A, copy a review URL of employee B (from the HR session) and open it — you get a 404.

---

## Project structure

```
src/
  proxy.ts                    Clerk route protection (Next 16 "middleware")
  app/
    page.tsx                  Landing page
    sign-in/, sign-up/        Clerk screens
    not-registered/           Clerk login with no employee record
    (app)/                    Signed-in area (shared sidebar layout)
      dashboard/              Role-aware landing page
      goals/                  My Goals + server actions
      review/                 Self-appraisal + server actions
      history/, reviews/[id]  Past reviews (read-only)
      team/, team/[employeeId] Manager views + server actions
      admin/                  HR: employees, cycles, report (+ CSV export route)
  components/                 UI kit, status badges, forms, review view
  lib/
    session.ts                Clerk user → employee record (+ first-login linking)
    supabase/server.ts        Supabase client that acts as the signed-in user (RLS)
    supabase/admin.ts         Service-role client (first-login linking only)
    data.ts, report.ts        Queries
    email.ts, notifications.ts Resend e-mails (server-only, never throw)
    format.ts, types.ts       Labels, rating scale, scoring, row types
supabase/
  schema.sql                  Tables, RLS policies, workflow triggers, audit log
  seed.sql                    Starter employees
  tests/rls.test.mjs          Automated security + workflow tests
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (run before pushing — Vercel runs the same) |
| `npm run lint` | ESLint |
| `npm run test:db` | RLS / workflow tests against `schema.sql` in an in-memory Postgres |
