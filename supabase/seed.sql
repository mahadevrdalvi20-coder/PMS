-- =============================================================================
-- Stride PMS — starter data
-- Run AFTER schema.sql. Replace the e-mail addresses with real inboxes you can
-- sign in with (Gmail "+" aliases work well: you+hr@gmail.com, you+mgr@gmail.com …).
-- On first sign-in, Clerk's verified e-mail is matched to these rows.
-- =============================================================================

insert into public.employees (full_name, email, designation, department, date_of_joining, role)
values ('Asha Rao', 'hr.admin@example.com', 'HR Business Partner', 'People', '2021-04-01', 'hr_admin')
on conflict ((lower(email))) do nothing;

insert into public.employees (full_name, email, designation, department, date_of_joining, role, manager_id)
select 'Vikram Mehta', 'manager@example.com', 'Engineering Manager', 'Engineering', '2020-07-15', 'manager',
       null
on conflict ((lower(email))) do nothing;

insert into public.employees (full_name, email, designation, department, date_of_joining, role, manager_id)
select v.full_name, v.email, v.designation, 'Engineering', v.doj::date, 'employee',
       (select id from public.employees where email = 'manager@example.com')
from (values
  ('Priya Nair',   'employee@example.com',  'Software Engineer',        '2023-01-09'),
  ('Rohan Kulkarni','employee2@example.com','Senior Software Engineer', '2022-03-21'),
  ('Sneha Iyer',   'employee3@example.com', 'QA Engineer',              '2024-06-03')
) as v(full_name, email, designation, doj)
on conflict ((lower(email))) do nothing;
