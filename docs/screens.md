# Screen map

> The lab asks for a one-page sketch of the screens — a photo of a hand-drawn sketch is fine. Add yours here as `docs/sketch.jpg`. This text version shows what each screen does and who sees it.

```
                         ┌──────────────┐
                         │ Landing  /   │──── Sign in (Clerk) ──┐
                         └──────────────┘                       ▼
                                                   ┌──────────────────────┐
                    no employee record ◄───────────│  /dashboard          │
                    /not-registered                │  role-aware          │
                                                   └──────────┬───────────┘
            ┌──────────────────────┬──────────────────────────┼──────────────────────────┐
       EVERYONE                 EVERYONE                   MANAGER                     HR ADMIN
   ┌──────────────┐        ┌──────────────┐          ┌──────────────┐       ┌──────────────────────┐
   │ /goals       │        │ /review      │          │ /team        │       │ /admin/employees     │
   │ add/edit/    │        │ self-        │          │ direct       │       │ list · add · edit    │
   │ delete/submit│        │ appraisal    │          │ reports +    │       │ manager & role       │
   │ (Σ = 100%)   │        │ goal by goal │          │ status       │       ├──────────────────────┤
   └──────────────┘        └──────────────┘          └──────┬───────┘       │ /admin/cycles        │
   ┌──────────────┐        ┌──────────────┐          ┌──────▼───────┐       │ create · open · close│
   │ /history     │──────► │ /reviews/:id │          │ /team/:id    │       ├──────────────────────┤
   │ past cycles  │        │ read-only    │          │ approve/send │       │ /admin/report        │
   └──────────────┘        └──────────────┘          │ back goals · │       │ completion · filters │
                                                     │ self LEFT |  │       │ CSV export           │
                                                     │ manager RIGHT│       └──────────────────────┘
                                                     └──────────────┘
```

| Screen | Employee | Manager | HR |
|---|---|---|---|
| Dashboard | Own progress + next step | + team completion & to-do list | + company pipeline, recent activity |
| My Goals / My Review / History | ✅ | ✅ (their own) | ✅ (their own) |
| My Team, Review Employee | — | Direct reports only | Any employee (via report) |
| Admin: Employees, Cycles, Report | — | — | ✅ |
