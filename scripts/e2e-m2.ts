// M2 end-to-end check in mock mode ($0): approvals → plan edits → approve → complete → redo scene → cancel.
// Acts as a real user through the same RPCs the web app calls (role=authenticated + JWT claims).
//   PROVIDER_MODE=mock worker must be running.  node --env-file=.env --import tsx scripts/e2e-m2.ts --user <uuid>
import pg from "pg";

const userId = process.argv[process.argv.indexOf("--user") + 1];
if (!userId || userId.startsWith("--")) throw new Error("--user <uuid> required");
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL!.replace(/\s+#.*$/, "").trim(), max: 2 });

async function asUser<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = await db.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('role','authenticated',true), set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: userId, role: "authenticated" })]);
    const r = await c.query(sql, params);
    await c.query("commit");
    return r.rows as T[];
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
const q = async <T = any>(sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as T[];
const status = async (id: string) => (await q<{ status: string; status_detail: string }>("select status, status_detail from public.projects where id=$1", [id]))[0]!;

async function waitFor(id: string, want: string[], timeoutS = 240): Promise<string> {
  const t0 = Date.now();
  for (;;) {
    const s = await status(id);
    if (want.includes(s.status)) return s.status;
    if (["failed", "canceled"].includes(s.status) && !want.includes(s.status)) throw new Error(`project ${s.status}: ${s.status_detail}`);
    if (Date.now() - t0 > timeoutS * 1000) throw new Error(`timeout waiting for ${want} (at ${s.status}: ${s.status_detail})`);
    await new Promise((r) => setTimeout(r, 1500));
  }
}
const ok = (name: string, cond: boolean, info = "") => console.log(`${cond ? "PASS" : "FAIL"} ${name}${info ? ` — ${info}` : ""}`);
const balance = async () => (await q<{ b: number }>("select coalesce(sum(delta),0)::int b from public.credits_ledger where user_id=$1", [userId]))[0]!.b;

const voice = (await q<{ id: string }>("select id from public.voices where user_id is null order by name limit 1"))[0]!.id;
const bal0 = await balance();

// ---------- 1. approvals flow
const [proj] = await asUser<{ id: string }>(
  `insert into public.projects (user_id,title,input_mode,input_text,format,target_duration_s,quality,voice_id,autopilot)
   values ($1,'[test] M2 approvals','topic','Why do cats purr? [test]','short_9x16',30,'standard',$2,false) returning id`, [userId, voice]);
const pid = proj!.id;
await asUser("select public.rpc_start_project($1)", [pid]);
ok("stops for script approval", (await waitFor(pid, ["awaiting_script_approval"])) === "awaiting_script_approval");

const [scr] = await q<{ full_text: string }>("select s.full_text from public.scripts s join public.projects p on p.current_script_id=s.id where p.id=$1", [pid]);
const edited = scr!.full_text.replace("deep rumble", "low rumble");
await asUser("select public.rpc_submit_script_edit($1,$2)", [pid, edited]);
const [v] = await q<{ version: number; source: string }>("select s.version, s.source from public.scripts s join public.projects p on p.current_script_id=s.id where p.id=$1", [pid]);
ok("script edit creates v2 (user_edit)", v!.version === 2 && v!.source === "user_edit", `v${v!.version} ${v!.source}`);
await asUser("select public.rpc_approve_script($1)", [pid]);
ok("re-plans and stops for plan approval", (await waitFor(pid, ["awaiting_plan_approval"])) === "awaiting_plan_approval");
await waitForEstimate(pid);
const est1 = (await q<{ e: number }>("select estimate_credits e from public.projects where id=$1", [pid]))[0]!.e;
const [sc0] = await q<{ id: string; narration: string }>("select id, narration from public.scenes where project_id=$1 order by idx limit 1 offset 1", [pid]);
ok("edited wording carried into scenes (smart remap)", sc0!.narration.includes("low rumble"), sc0!.narration.slice(0, 50));

await asUser("select public.rpc_set_scene_animate($1,false)", [sc0!.id]);
await waitForEstimate(pid);
const est2 = (await q<{ e: number }>("select estimate_credits e from public.projects where id=$1", [pid]))[0]!.e;
ok("turning motion off lowers the estimate", est2 < est1, `${est1} → ${est2} credits`);

await asUser("select public.rpc_approve_plan($1)", [pid]);
const held = bal0 - (await balance());
ok("approve holds the estimate", held === est2, `held ${held}`);
ok("generation completes", (await waitFor(pid, ["completed"], 300)) === "completed");
const bal1 = await balance();
ok("mock run releases the whole hold (nothing charged)", bal1 === bal0, `balance ${bal0} → ${bal1}`);

// ---------- 2. redo scene 3
const [s3] = await q<{ id: string; keyframe_asset_id: string }>("select id, keyframe_asset_id from public.scenes where project_id=$1 and idx=2", [pid]);
const others = await q<{ id: string; keyframe_asset_id: string; clip_asset_id: string | null }>(
  "select id, keyframe_asset_id, clip_asset_id from public.scenes where project_id=$1 and idx<>2 order by idx", [pid]);
const rendersBefore = (await q<{ n: number }>("select count(*)::int n from public.renders where project_id=$1", [pid]))[0]!.n;
const t0 = Date.now();
await asUser("select public.rpc_regenerate_scene($1,'keyframe',null,null,true)", [s3!.id]);
await waitFor(pid, ["completed"], 180);
const secs = (Date.now() - t0) / 1000;
const [s3b] = await q<{ keyframe_asset_id: string; revision: number }>("select keyframe_asset_id, revision from public.scenes where id=$1", [s3!.id]);
const othersAfter = await q<{ id: string; keyframe_asset_id: string; clip_asset_id: string | null }>(
  "select id, keyframe_asset_id, clip_asset_id from public.scenes where project_id=$1 and idx<>2 order by idx", [pid]);
ok("redo replaces only scene 3", s3b!.keyframe_asset_id !== s3!.keyframe_asset_id && s3b!.revision === 2 &&
  JSON.stringify(othersAfter) === JSON.stringify(others));
const rendersAfter = (await q<{ n: number }>("select count(*)::int n from public.renders where project_id=$1", [pid]))[0]!.n;
ok("redo produces a new render", rendersAfter === rendersBefore + 1);
ok("redo + re-assembly under 60 s", secs < 60, `${secs.toFixed(1)} s`);

// ---------- 3. cancel mid-generation
const [p2] = await asUser<{ id: string }>(
  `insert into public.projects (user_id,title,input_mode,input_text,format,target_duration_s,quality,voice_id,autopilot)
   values ($1,'[test] M2 cancel','topic','Why do cats purr? [test cancel]','short_9x16',30,'standard',$2,true) returning id`, [userId, voice]);
await asUser("select public.rpc_start_project($1)", [p2!.id]);
await waitFor(p2!.id, ["locking_style", "narrating", "generating_scenes"]);
const heldNow = bal0 - (await balance());
await asUser("select public.rpc_cancel_project($1)", [p2!.id]);
await new Promise((r) => setTimeout(r, 4000));
const st = await status(p2!.id);
const out = (await q<{ n: number }>(
  "select (coalesce(-sum(delta) filter (where reason='reservation'),0) - coalesce(sum(delta) filter (where reason='reservation_release'),0))::int n from public.credits_ledger where project_id=$1", [p2!.id]))[0]!.n;
ok("cancel stops the project", st.status === "canceled", st.status);
ok("cancel releases the hold", out === 0 && (await balance()) === bal0, `was holding ${heldNow}, outstanding now ${out}`);

async function waitForEstimate(id: string) {
  for (let i = 0; i < 60; i++) {
    const [r] = await q<{ e: number | null }>("select estimate_credits e from public.projects where id=$1", [id]);
    if (r!.e !== null) return;
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error("estimate never recalculated");
}

console.log(`\ntest projects: ${pid}, ${p2!.id}`);
await db.end();
