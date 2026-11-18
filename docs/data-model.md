# Data model

Source of truth: [`supabase/schema.sql`](../supabase/schema.sql). GitHub renders the diagram below.

```mermaid
erDiagram
    employees ||--o{ employees : "manager_id (reports to)"
    employees ||--o{ goals : "sets"
    employees ||--o{ reviews : "is reviewed in"
    employees ||--o{ review_cycles : "created_by"
    review_cycles ||--o{ goals : "contains"
    review_cycles ||--o{ reviews : "contains"
    reviews ||--o{ goal_ratings : "line items"
    goals ||--o{ goal_ratings : "rated in"
    employees ||--o{ audit_log : "actor / subject"

    employees {
        uuid id PK
        text clerk_user_id UK "set on first sign-in"
        text full_name
        text email UK "lower-cased"
        text designation
        text department
        date date_of_joining
        uuid manager_id FK "self-reference"
        app_role role "employee | manager | hr_admin"
        bool is_active
    }
    review_cycles {
        uuid id PK
        text name
        date start_date
        date end_date
        cycle_status status "draft | open | closed (max 1 open)"
        uuid created_by FK
    }
    goals {
        uuid id PK
        uuid employee_id FK
        uuid cycle_id FK
        text title
        text description
        numeric weightage "0 < w <= 100; total must be 100 to submit"
        date target_date
        goal_status status "draft | submitted | approved | sent_back"
        text manager_comment "required when sent back"
    }
    reviews {
        uuid id PK
        uuid employee_id FK
        uuid manager_id FK "reviewer snapshot"
        uuid cycle_id FK
        review_status status "not_started | self_submitted | manager_reviewed | completed"
        smallint overall_self_rating "1-5"
        text self_summary
        smallint overall_manager_rating "1-5"
        text manager_summary
        timestamptz submitted_at
        timestamptz reviewed_at
        timestamptz completed_at
    }
    goal_ratings {
        uuid id PK
        uuid review_id FK
        uuid goal_id FK
        text self_comment
        smallint self_rating "1-5"
        text manager_comment
        smallint manager_rating "1-5"
    }
    audit_log {
        bigint id PK
        uuid actor_id FK
        text entity "goal | review | cycle"
        uuid entity_id
        uuid employee_id FK
        text action "e.g. status:submitted→approved"
    }
```

## Foreign keys in one line each

- `employees.manager_id → employees.id` — who you report to; `on delete set null` so removing a manager doesn't delete their team.
- `goals.employee_id → employees.id` — whose goal it is.
- `goals.cycle_id → review_cycles.id` — which cycle the goal belongs to, so years never mix.
- `reviews.employee_id → employees.id` — who is being appraised (unique per cycle).
- `reviews.cycle_id → review_cycles.id` — which cycle this appraisal is for.
- `reviews.manager_id → employees.id` — who reviewed them at the time (survives later manager changes).
- `goal_ratings.review_id → reviews.id` — the review this line item belongs to.
- `goal_ratings.goal_id → goals.id` — the goal being rated (unique per review).

## State machines (enforced by triggers)

**Goal status**

```mermaid
stateDiagram-v2
    direction LR
    [*] --> draft
    draft --> submitted : employee (total = 100%)
    sent_back --> submitted : employee
    submitted --> approved : manager
    submitted --> sent_back : manager + comment
```

**Review status**

```mermaid
stateDiagram-v2
    direction LR
    [*] --> not_started
    not_started --> self_submitted : employee (all goals rated)
    self_submitted --> manager_reviewed : manager (all goals rated + summary)
    manager_reviewed --> self_submitted : manager re-opens to edit
    manager_reviewed --> completed : manager / HR
    completed --> [*]
```
