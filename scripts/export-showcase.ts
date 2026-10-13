// Copies one finished video (final render + its scene keyframes) from R2 into apps/web/public/showcase for the landing page.
//   node --env-file=.env --import tsx scripts/export-showcase.ts --title "What If You Never Slept Again?"
import { mkdir, writeFile } from "node:fs/promises";
import pg from "pg";
import { r2ConfigFromEnv } from "../supabase/functions/_shared/r2.ts";
import { Storage } from "../apps/worker/src/storage.ts";

const title = process.argv[process.argv.indexOf("--title") + 1];
if (!title || title.startsWith("--")) throw new Error("--title required");
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL!.replace(/\s+#.*$/, "").trim(), max: 1 });
const storage = new Storage(r2ConfigFromEnv((k) => process.env[k]));
const out = "apps/web/public/showcase";
await mkdir(out, { recursive: true });

const [p] = (await db.query(
  `select p.id, a.r2_key from public.projects p join public.renders r on r.id = p.final_render_id join public.assets a on a.id = r.asset_id
   where p.title = $1 and p.status = 'completed' order by p.created_at desc limit 1`, [title])).rows;
if (!p) throw new Error(`no completed project titled ${title}`);
await writeFile(`${out}/video.mp4`, await storage.get(p.r2_key));
const scenes = (await db.query(
  `select s.idx, a.r2_key from public.scenes s join public.assets a on a.id = s.keyframe_asset_id where s.project_id = $1 order by s.idx`, [p.id])).rows;
for (const s of scenes) await writeFile(`${out}/scene-${s.idx + 1}.png`, await storage.get(s.r2_key));
console.log(`exported video + ${scenes.length} keyframes`);
await db.end();
