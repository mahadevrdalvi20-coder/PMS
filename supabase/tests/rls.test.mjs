import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

// Row Level Security + workflow tests. Runs the real schema.sql in an in-memory
// Postgres (PGlite) and acts as different users. Run with: npm run test:db


const root = process.argv[2] ?? new URL("../..", import.meta.url).pathname;
const db = new PGlite();
const ok = (m) => console.log("  ✓", m);
let failures = 0;
const fail = (m) => { failures++; console.log("  ✗", m); };

await db.exec(`
  create schema auth;
  create role authenticated; create role anon; create role authenticator;
  create function auth.jwt() returns jsonb language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
  grant usage on schema auth to authenticated, anon;
`);
await db.exec(fs.readFileSync(`${root}/supabase/schema.sql`, "utf8"));
await db.exec(fs.readFileSync(`${root}/supabase/seed.sql`, "utf8"));
await db.exec(`
  grant usage on schema public to authenticated;
  grant all on all tables in schema public to authenticated;
  update employees set clerk_user_id = 'u_hr'  where email='hr.admin@example.com';
  update employees set clerk_user_id = 'u_mgr' where email='manager@example.com';
  update employees set clerk_user_id = 'u_a'   where email='employee@example.com';
  update employees set clerk_user_id = 'u_b'   where email='employee2@example.com';
`);
ok("schema + seed load");

async function as(sub, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claims', '${JSON.stringify({ sub, role: "authenticated" })}', false); set role authenticated;`);
  try { return await db.query(sql, params); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
}
async function expectErr(label, sub, sql, re) {
  try { await as(sub, sql); fail(`${label} (no error)`); }
  catch (e) { (re && !re.test(e.message)) ? fail(`${label}: ${e.message}`) : ok(`${label} → blocked (${e.message.slice(0, 70)})`); }
}
const id = async (email) => (await db.query(`select id from employees where email=$1`, [email])).rows[0].id;
const A = await id("employee@example.com"), B = await id("employee2@example.com");

// HR creates & opens cycle
const c = await as("u_hr", `insert into review_cycles(name,start_date,end_date,created_by) values('FY 2026-27','2026-04-01','2027-03-31',current_employee_id()) returning id`);
const cycle = c.rows[0].id;
await as("u_hr", `update review_cycles set status='open' where id='${cycle}'`);
ok("HR creates and opens cycle");
await expectErr("employee creates cycle", "u_a", `insert into review_cycles(name,start_date,end_date) values('x','2026-01-01','2026-02-01')`);
await expectErr("second open cycle", "u_hr", `insert into review_cycles(name,start_date,end_date,status) values('y','2026-01-01','2026-02-01','open')`);

// goals
for (const [t, w] of [["Ship billing", 40], ["Reduce bugs", 30], ["Mentor intern", 30]])
  await as("u_a", `insert into goals(employee_id,cycle_id,title,weightage,status) values('${A}','${cycle}','${t}',${w},'approved')`);
const g = await as("u_a", `select status from goals where employee_id='${A}'`);
g.rows.every((r) => r.status === "draft") ? ok("employee goals forced to draft") : fail("status not forced");
await expectErr("A inserts goal for B", "u_a", `insert into goals(employee_id,cycle_id,title,weightage) values('${B}','${cycle}','x',10)`);
await expectErr("A approves own goal", "u_a", `update goals set status='approved' where employee_id='${A}'`);
await as("u_a", `update goals set status='submitted' where employee_id='${A}'`);
ok("A submits goals");
await expectErr("A edits submitted goal", "u_a", `update goals set title='z' where employee_id='${A}'`, /locked/);
const bSees = await as("u_b", `select * from goals where employee_id='${A}'`);
bSees.rows.length === 0 ? ok("B cannot see A's goals") : fail("B sees A's goals");
const mSees = await as("u_mgr", `select * from goals where employee_id='${A}'`);
mSees.rows.length === 3 ? ok("manager sees A's goals") : fail("manager can't see");
await expectErr("manager sends back without comment", "u_mgr", `update goals set status='sent_back' where employee_id='${A}' and title='Mentor intern'`, /comment/);
await expectErr("manager edits goal title", "u_mgr", `update goals set title='hack' where employee_id='${A}'`);
await as("u_mgr", `update goals set status='approved' where employee_id='${A}'`);
ok("manager approves");

// review
const r = await as("u_a", `insert into reviews(employee_id,cycle_id) values('${A}','${cycle}') returning id, manager_id`);
const rev = r.rows[0].id;
r.rows[0].manager_id ? ok("review manager snapshot set") : fail("no manager snapshot");
await expectErr("submit self-appraisal with no ratings", "u_a", `update reviews set status='self_submitted', overall_self_rating=4 where id='${rev}'`, /Rate/);
await as("u_a", `insert into goal_ratings(review_id,goal_id,self_rating,self_comment,manager_rating) select '${rev}', id, 4, 'done', 5 from goals where employee_id='${A}'`);
const mr = await db.query(`select count(*)::int n from goal_ratings where manager_rating is not null`);
mr.rows[0].n === 0 ? ok("employee cannot pre-fill manager rating") : fail("manager rating injected");
await expectErr("manager reviews before self-submit", "u_mgr", `update reviews set overall_manager_rating=3 where id='${rev}'`, /not open for manager/);
await as("u_a", `update reviews set status='self_submitted', overall_self_rating=4 where id='${rev}'`);
ok("A submits self-appraisal");
await expectErr("A edits after submit", "u_a", `update reviews set self_summary='x' where id='${rev}'`, /already/);
const bRev = await as("u_b", `select * from reviews where id='${rev}'`);
bRev.rows.length === 0 ? ok("B cannot read A's review (URL tampering)") : fail("B reads A's review!");
const bGr = await as("u_b", `select * from goal_ratings where review_id='${rev}'`);
bGr.rows.length === 0 ? ok("B cannot read A's goal ratings") : fail("B reads ratings!");
const bUpd = await as("u_b", `update reviews set manager_summary='x' where id='${rev}' returning id`).catch(() => ({ rows: [] }));
bUpd.rows.length === 0 ? ok("B update affects 0 rows") : fail("B updated");
await expectErr("manager completes before review", "u_mgr", `update reviews set status='completed' where id='${rev}'`);
await expectErr("manager submits without ratings", "u_mgr", `update reviews set status='manager_reviewed', overall_manager_rating=4, manager_summary='Good' where id='${rev}'`, /Rate/);
await expectErr("manager edits self rating", "u_mgr", `update goal_ratings set self_rating=1 where review_id='${rev}'`);
await as("u_mgr", `update goal_ratings set manager_rating=4, manager_comment='Solid' where review_id='${rev}'`);
await as("u_mgr", `update reviews set status='manager_reviewed', overall_manager_rating=4, manager_summary='Good year' where id='${rev}'`);
await as("u_mgr", `update reviews set status='completed' where id='${rev}'`);
const fin = await as("u_hr", `select status, completed_at from reviews where id='${rev}'`);
fin.rows[0].status === "completed" && fin.rows[0].completed_at ? ok("HR sees Completed") : fail("not completed");
const audit = await as("u_hr", `select action from audit_log order by id`);
ok(`audit log has ${audit.rows.length} entries`);
const anon = await db.query(`set role anon; select count(*)::int n from employees`).catch((e) => ({ err: e.message }));
await db.exec("reset role");
ok(`anon read: ${anon.err ? "denied" : JSON.stringify(anon)}`);
await expectErr("manager loop", "u_hr", `update employees set manager_id='${A}' where email='manager@example.com'`, /loop/);
await as("u_a", `update employees set role='hr_admin' where id='${A}'`).catch(() => {});
const roleNow = (await db.query(`select role from employees where id='${A}'`)).rows[0].role;
roleNow === "employee" ? ok("employee cannot self-promote") : fail("self-promotion!");

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL PASSED");
process.exit(failures ? 1 : 0);
