// Generates one sample frame for each visual style that has no real sample yet (apps/web/public/styles/<key>.jpg),
// using the same style system prompt the worker uses for real videos. Live fal spend: one text-to-image call per
// missing style (~$0.045 each, docs/03 price table). Refuses to run without --confirm.
//   node --env-file=.env --import tsx scripts/generate-style-samples.ts --confirm
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import ffmpegPath from "ffmpeg-static";
import { ENDPOINTS, renderStyleSystemPrompt, STYLE_PRESETS } from "../packages/core/src/index.ts";

const OUT = "apps/web/public/styles";
const EST_USD = 0.045;
// Same subject for every style so the tiles compare like-for-like.
const SUBJECT = "A ginger cat curled up asleep on a round cushion in a cosy living room, soft rounded sound-wave ripples rising from it as it purrs, a houseplant and a window behind.";

const missing = STYLE_PRESETS.filter((p) => !existsSync(`${OUT}/${p.key}.jpg`));
if (!missing.length) { console.log("All styles already have samples."); process.exit(0); }
if (!process.argv.includes("--confirm")) {
  console.log(`Would generate ${missing.length} samples (${missing.map((p) => p.key).join(", ")}) ≈ $${(missing.length * EST_USD).toFixed(3)}. Re-run with --confirm.`);
  process.exit(1);
}
const key = process.env.FAL_KEY;
if (!key) throw new Error("FAL_KEY missing");
const auth = { Authorization: `Key ${key}`, "Content-Type": "application/json" };

async function generate(system: string): Promise<string> {
  const sub = await fetch(`https://queue.fal.run/${ENDPOINTS.imageT2I}`, {
    method: "POST", headers: auth,
    body: JSON.stringify({ prompt: SUBJECT, system_prompt: system, aspect_ratio: "9:16", resolution: "1K", num_images: 1 }),
  });
  if (!sub.ok) throw new Error(`fal submit failed: ${sub.status} ${await sub.text()}`);
  const { status_url, response_url } = (await sub.json()) as Record<string, string>;
  for (let delay = 2000; ; delay = Math.min(delay * 1.5, 10_000)) {
    const st = (await (await fetch(status_url!, { headers: auth })).json()) as { status: string; error?: string };
    if (st.status === "COMPLETED") { if (st.error) throw new Error(`fal error: ${st.error}`); break; }
    await new Promise((r) => setTimeout(r, delay));
  }
  const res = (await (await fetch(response_url!, { headers: auth })).json()) as { images?: { url: string }[] };
  const url = res.images?.[0]?.url;
  if (!url) throw new Error(`no image in fal response: ${JSON.stringify(res).slice(0, 200)}`);
  return url;
}

let spent = 0;
for (const p of missing) {
  const url = await generate(renderStyleSystemPrompt(p.spec));
  const raw = `${OUT}/_${p.key}.png`;
  await writeFile(raw, Buffer.from(await (await fetch(url)).arrayBuffer()));
  execFileSync(ffmpegPath as unknown as string, ["-v", "error", "-y", "-i", raw, "-vf", "scale=360:-2", "-q:v", "4", `${OUT}/${p.key}.jpg`]);
  await unlink(raw);
  spent += EST_USD;
  console.log(`${p.key}: done`);
}
console.log(`Generated ${missing.length} samples, est. $${spent.toFixed(3)} (direct fal calls, not recorded in the jobs table).`);
