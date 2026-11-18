# Research Note: Performance Management Systems

*Stage 0 deliverable for the AI PMS Lab. This note explains the HR process **before** the software, and says which design decision in Stride comes from which finding.*

> ✏️ **Before you submit:** this is a starting draft. Rewrite it in your own words and add your own examples. You will be questioned on it in the demo.

---

## 1. KRA vs KPI vs Goal

| Term | What it is | Example for a **Customer Support Executive** |
|---|---|---|
| **KRA** (Key Result Area) | A broad area of the job the person is accountable for. Stable year to year. | *Customer satisfaction* |
| **KPI** (Key Performance Indicator) | The metric that shows how well the KRA is going. | *CSAT score; average first-response time* |
| **Goal** | A specific, time-bound target on a KPI for **this cycle**. | *Raise CSAT from 82% to 90% by 31 March 2027* |

KRA = *where* you are accountable, KPI = *how* it is measured, Goal = *how much, by when* this cycle.

**In Stride:** we store **goals** (title, description + success measure, weightage, target date), linked to a **cycle**. The goal form asks for the success measure because a goal without a KPI cannot be rated fairly.

## 2. SMART goals

**S**pecific · **M**easurable · **A**chievable · **R**elevant · **T**ime-bound.

| Bad goal | Why it is bad | SMART version |
|---|---|---|
| "Improve code quality" | Not measurable, no deadline. Manager and employee will argue about it at review time. | "Reduce escaped production bugs by 30% versus the FY25 baseline by 31 March 2027" |
| "Work hard on sales" | Effort is not an outcome. | "Close ₹40L of new ARR in Q3–Q4" |

A badly written goal shows up as **rating disputes** at year end: the two people never agreed what "done" meant. That is why the manager can **send a goal back with a required comment** before the cycle gets going.

## 3. The appraisal cycle — stages and who acts

| # | Stage | Who acts | In Stride |
|---|---|---|---|
| 1 | Cycle set-up | HR | HR creates a cycle (Draft) and **opens** it. Only one cycle can be open. |
| 2 | Goal setting | Employee | Adds goals; weightages must total **100%**; submits. |
| 3 | Goal approval | Manager | Approves each goal, or **sends it back** with a comment. Goal: `draft → submitted → approved / sent_back`. |
| 4 | (Mid-year check-in) | Both | Out of scope for the MVP. |
| 5 | Self-appraisal | Employee | Rates each approved goal 1–5 with an achievement comment, plus an overall rating. |
| 6 | Manager review | Manager | Sees the self-appraisal **side by side**, rates each goal, gives an overall rating and summary. |
| 7 | Calibration / normalisation | HR + leadership | Out of scope (see §6). |
| 8 | Closure & communication | Manager → Employee, HR | Manager **completes** the review; employee can now see the ratings; HR closes the cycle. |

Review status workflow (one row per employee per cycle):
`Not Started → Self-Appraisal Submitted → Manager Reviewed → Completed`

## 4. Why ask the employee first (self-appraisal)?

- **Evidence:** the employee knows what they did; managers of 8–10 people forget things from 11 months ago.
- **Ownership and engagement:** people accept an outcome more when their voice was part of it.
- **Gap spotting:** a big gap between self and manager rating is exactly the conversation that needs to happen. That is why Stride shows them **next to each other**.
- **Recency bias:** writing it down goal by goal forces the whole year into view.

Design consequence: the employee's self-appraisal is **locked** once submitted, and the employee does **not** see the manager's rating until the review is completed — so neither side anchors on the other's draft.

## 5. Rating scales

| Scale | Pros | Cons |
|---|---|---|
| **3-point** (Below / Meets / Exceeds) | Simple, fast, little argument. | Too coarse — 80% of people land in "Meets"; no way to distinguish strong from solid. |
| **4-point** (no middle) | **Forces a decision** — no "safe" middle option. | Feels harsh; a genuinely average performer has to be pushed up or down. |
| **5-point** (Unsatisfactory → Outstanding) | Familiar, enough granularity, has a true "Meets". | **Central tendency** — managers pile onto 3 to avoid hard conversations. |

**Why some companies avoid a middle option:** to fight central tendency and force managers to differentiate.

**Stride uses a 5-point scale with behavioural labels** (1 Unsatisfactory, 2 Needs Improvement, 3 Meets Expectations, 4 Exceeds Expectations, 5 Outstanding). Labels reduce the "what does a 3 mean?" problem. Stride also shows a **weighted goal score** (Σ rating × weight / 100) next to the overall rating, which makes a "3 everywhere" overall rating easy to challenge when the goal ratings say otherwise.

## 6. Normalisation, calibration and the bell curve

- **Calibration:** managers meet and compare ratings across teams so a "4" means the same in every team (one manager may be lenient, another tough).
- **Normalisation / bell curve (forced distribution):** ratings are adjusted so that, e.g., 10% are top, 70% middle, 20% bottom.
- **Why controversial:** it assumes every team's performance is normally distributed (a small team of strong performers is not); it forces managers to rate someone down to fit a quota; it encourages competition over collaboration; several large companies (Microsoft, Adobe, Accenture) dropped stack ranking.

**In Stride:** out of scope. HR's report shows the **distribution of final ratings for information only — no forced curve**.

## 7. OKRs vs KRA-based appraisals

| | OKRs | Traditional KRA appraisal |
|---|---|---|
| Purpose | Alignment and stretch ambition | Evaluation, linked to pay/promotion |
| Cadence | Quarterly | Annual / half-yearly |
| Scoring | 0.0–1.0; 0.7 is "good" | Rating scale (e.g. 1–5) |
| Linked to pay? | Deliberately **not** | Usually yes |
| Visibility | Often public company-wide | Private (employee, manager, HR) |

Stride models the **KRA/goal-based appraisal**, because the problem statement is an annual appraisal that feeds promotion discussions.

## 8. Real PMS products

| Product | Main screens | Liked | Disliked |
|---|---|---|---|
| **Keka** (popular in India) | Goals/OKRs, review cycles, 1:1s, 360 feedback, analytics | Clean cycle set-up; weightage checks; mobile app | Many modules → busy navigation for a simple employee |
| **Darwinbox** | Goals, continuous feedback, appraisal forms, normalisation | Very configurable for large enterprises | Configuration-heavy; forms feel long |
| **Lattice** | Goals, reviews, 1:1s, engagement surveys, growth plans | Excellent side-by-side review UX; good writing prompts | Expensive; review config is complex for small HR teams |

What Stride takes from them: a **role-aware dashboard** with a clear "next step", **side-by-side** review, and a **completion report** HR can export.

## 9. Sensitive data — who must never see it

| Data | Who may see it | Who must **never** see it |
|---|---|---|
| Ratings & review comments | The employee (after completion), their current manager, HR | Peers, other managers, other employees |
| Self-appraisal draft | The employee | Everyone else until submitted |
| Manager's draft rating | Manager, HR | The employee until the review is completed |
| Goals | Employee, manager, HR | Other employees |
| Salary / bonus (not in scope) | HR, comp team | Everyone else |

**How Stride enforces it:**
1. **Row Level Security in Postgres** — every query runs *as the signed-in user*; the policies only return rows where the user is the employee, their current manager, or HR. Changing a review id in the URL returns **404**, because the database returns no row. This is tested automatically (`npm run test:db`).
2. **Triggers enforce the workflow** — an employee cannot approve their own goal, write a manager rating, or edit a submitted self-appraisal even with a hand-crafted API request.
3. **Server-only secrets** — the Supabase service key and Resend key are never sent to the browser (`server-only` imports).
4. **Known limitation:** the employee is hidden from the manager's in-progress ratings by the application, not by RLS (RLS works on rows, not columns). A stricter design would expose reviews through a Postgres view that nulls manager columns until `completed`.

## 10. How the research shaped the data model

| Finding | Decision |
|---|---|
| A manager is an employee with reports | **One** `employees` table, `manager_id` self-reference. "Manager" view = has ≥1 active direct report. |
| Goals belong to a period | `goals.cycle_id` — next year's goals never mix with this year's. |
| The plan ≠ the outcome | `goals` (plan) and `goal_ratings` (outcome) are separate tables. |
| A review is a workflow | `reviews.status` with a trigger-enforced state machine; one row per employee per cycle (`unique(employee_id, cycle_id)`). |
| Reporting lines change mid-year | `reviews.manager_id` snapshots who the reviewer was; access uses the **current** manager. |
| "Auditable" | `audit_log` table written by triggers on every status change. |

See [`docs/data-model.md`](docs/data-model.md) for the diagram and [`docs/screens.md`](docs/screens.md) for the screen sketch.
