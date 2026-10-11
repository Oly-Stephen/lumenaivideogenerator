// M1 orchestrator (docs/03 §3): one step per `orchestrate` message; each step persists its results and
// enqueues the next message, so a crash resumes from the last completed step.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  alignTokens, deriveSeed, estimateUsd, getPreset, renderStyleSystemPrompt, requestDurationS, styleSuffix,
  timeScenes, tokenize, validatePlanAgainstTokens, type AlignedWord, type SttWord,
} from "@lumen/core";
import type { Config } from "../config.ts";
import { assetKey, failProject, getProject, setDetail, setStatus, upsertAsset, type Db, type ProjectRow } from "../db.ts";
import { ffmpeg, mockImage, mockTone, mockVideo, probe } from "../media.ts";
import { BudgetExceededError, FalClient, ReplayMissError } from "../providers/fal.ts";
import { fishTts } from "../providers/fish.ts";
import { AwaitingAuthorError, type LlmProvider } from "../providers/llm.ts";
import { render } from "../render.ts";
import type { Storage } from "../storage.ts";
import { send } from "../queue.ts";

export interface Ctx {
  cfg: Config;
  db: Db;
  storage: Storage;
  fal: FalClient;
  llm: LlmProvider;
}

interface SceneRow {
  id: string; idx: number; revision: number; narration: string; word_start: number; word_end: number;
  start_ms: number | null; end_ms: number | null; shot_type: string; visual_prompt: string; motion_prompt: string;
  character_ids: string[]; animate: boolean; seed: string; status: string;
  keyframe_asset_id: string | null; clip_asset_id: string | null;
}
interface CharRow { id: string; ref_tag: string; name: string; description: string; sheet_asset_id: string | null; seed: string }

const dims = (p: ProjectRow) => (p.format === "short_9x16" ? { w: 1080, h: 1920, ar: "9:16" } : { w: 1920, h: 1080, ar: "16:9" });
const pkey = (p: ProjectRow, rest: string) => `u/${p.user_id}/p/${p.id}/${rest}`;

export async function advance(ctx: Ctx, projectId: string): Promise<void> {
  const p = await getProject(ctx.db, projectId);
  if (!p) return;
  try {
    switch (p.status) {
      case "researching":
      case "scripting":
      case "planning":
        return await stepWrite(ctx, p);
      case "locking_style":
        return await stepLockStyle(ctx, p);
      case "narrating":
        return await stepNarrate(ctx, p);
      case "generating_scenes":
        return await stepScenes(ctx, p);
      case "assembling":
        return await stepMusic(ctx, p);
      case "rendering":
        return await stepRender(ctx, p);
      default:
        return; // terminal or waiting for a human
    }
  } catch (err) {
    if (err instanceof AwaitingAuthorError) {
      await setDetail(ctx.db, p.id, err.message);
      await send(ctx.db, "orchestrate", { project_id: p.id }, 30); // poll for the authored script
      return;
    }
    if (err instanceof BudgetExceededError) {
      await setStatus(ctx.db, p.id, "paused_insufficient_credits", err.message);
      return;
    }
    console.error(`[orchestrate] ${p.id} ${p.status} failed`, err);
    await failProject(ctx.db, p.id, err instanceof ReplayMissError ? new Error(`${err.message}`) : err, p.status);
  }
}

const next = (ctx: Ctx, id: string) => send(ctx.db, "orchestrate", { project_id: id });

// ---------------------------------------------------------------- 1. research + script + plan
async function stepWrite(ctx: Ctx, p: ProjectRow): Promise<void> {
  await setDetail(ctx.db, p.id, p.input_mode === "topic" ? "Researching the topic and writing the script…" : "Preparing your script…", 5);
  const bundle = await ctx.llm.produce({ projectId: p.id, mode: p.input_mode, text: p.input_text });
  const tokens = tokenize(bundle.script.full_text);
  validatePlanAgainstTokens(bundle.plan, tokens.length);
  const { rows: cfgRows } = await ctx.db.query<{ max_scenes_per_project: number }>("select max_scenes_per_project from public.app_config");
  if (bundle.plan.scenes.length > (cfgRows[0]?.max_scenes_per_project ?? 12)) throw new Error("plan exceeds the scene cap");

  const client = await ctx.db.connect();
  try {
    await client.query("begin");
    const scr = await client.query<{ id: string }>(
      `insert into public.scripts (project_id, version, source, language, prompt_version, research, hook, body, full_text, word_count, est_duration_s)
       values ($1, 1, 'ai', $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (project_id, version) do update set body = excluded.body returning id`,
      [p.id, p.language, bundle.source, JSON.stringify({ research: bundle.research, music_prompt: bundle.plan.music_prompt }), bundle.script.hook, JSON.stringify(bundle.script),
        bundle.script.full_text, tokens.length, (tokens.length / 2.5).toFixed(2)]);
    const scriptId = scr.rows[0]!.id;
    await client.query("delete from public.chapters where script_id = $1", [scriptId]);
    await client.query("insert into public.chapters (project_id, script_id, idx, title, narration) values ($1,$2,0,$3,$4)",
      [p.id, scriptId, bundle.script.chapters[0]?.title ?? bundle.script.title, bundle.script.full_text]);

    await client.query("delete from public.scenes where project_id = $1", [p.id]);
    await client.query("delete from public.characters where project_id = $1", [p.id]);
    const charIds = new Map<string, string>();
    for (const c of bundle.plan.characters) {
      const r = await client.query<{ id: string }>(
        "insert into public.characters (project_id, user_id, name, ref_tag, description) values ($1,$2,$3,$4,$5) returning id",
        [p.id, p.user_id, c.name, c.ref_tag, c.description]);
      charIds.set(c.ref_tag, r.rows[0]!.id);
    }

    // budget tier animates ~30% of scenes (highest priority); standard animates all
    const ranked = [...bundle.plan.scenes.keys()].sort((a, b) => bundle.plan.scenes[b]!.animate_priority - bundle.plan.scenes[a]!.animate_priority);
    const animateSet = new Set(p.quality === "budget" ? ranked.slice(0, Math.max(1, Math.round(ranked.length * 0.3))) : ranked);

    for (const [i, s] of bundle.plan.scenes.entries()) {
      await client.query(
        `insert into public.scenes (project_id, idx, narration, word_start, word_end, shot_type, visual_prompt, motion_prompt,
           character_ids, location_key, on_screen_text, animate, seed)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [p.id, i, tokens.slice(s.word_start, s.word_end + 1).join(" "), s.word_start, s.word_end, s.shot_type, s.visual_prompt,
          s.motion_prompt, s.characters.map((t) => charIds.get(t)!), s.location_key, s.on_screen_text, animateSet.has(i),
          await deriveSeed(Number(p.project_seed), i, 1)]);
    }
    await client.query("update public.projects set current_script_id = $2, title = coalesce(title, $3) where id = $1",
      [p.id, scriptId, bundle.script.title]);
    await client.query("update public.projects set status = 'locking_style', status_detail = 'Script ready — locking the visual style…', progress = 15 where id = $1", [p.id]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
  // M1 runs on autopilot (approval checkpoints arrive in M2)
  await next(ctx, p.id);
}

// ---------------------------------------------------------------- 2. style frame + character sheets
async function styleFor(ctx: Ctx, p: ProjectRow): Promise<{ id: string; system: string; frameAsset: string | null; seed: number; spec: ReturnType<typeof getPreset>["spec"] }> {
  const preset = getPreset(p.style_preset);
  const system = renderStyleSystemPrompt(preset.spec);
  if (p.style_bible_id) {
    const { rows } = await ctx.db.query<{ id: string; system_prompt: string; style_frame_asset_id: string | null; seed: string }>(
      "select id, system_prompt, style_frame_asset_id, seed from public.style_bibles where id = $1", [p.style_bible_id]);
    if (rows[0]) return { id: rows[0].id, system: rows[0].system_prompt, frameAsset: rows[0].style_frame_asset_id, seed: Number(rows[0].seed), spec: preset.spec };
  }
  const { rows } = await ctx.db.query<{ id: string; seed: string }>(
    "insert into public.style_bibles (user_id, name, preset_key, spec, system_prompt) values ($1,$2,$3,$4,$5) returning id, seed",
    [p.user_id, `${preset.name} — ${p.title ?? "project"}`, preset.key, JSON.stringify(preset.spec), system]);
  await ctx.db.query("update public.projects set style_bible_id = $2 where id = $1", [p.id, rows[0]!.id]);
  return { id: rows[0]!.id, system, frameAsset: null, seed: Number(rows[0]!.seed), spec: preset.spec };
}

async function genImage(ctx: Ctx, p: ProjectRow, o: {
  kind: string; key: string; prompt: string; system: string; refs: string[]; ar: string; seed: number; sceneId?: string; revision?: number; res?: string;
}): Promise<string> {
  const d = dims(p);
  if (ctx.cfg.mode === "mock") {
    const tmp = join(ctx.cfg.tmpDir, `mock_${o.seed}.png`);
    const [w, h] = o.ar === "16:9" ? [1024, 576] : o.ar === "9:16" ? [576, 1024] : [768, 768];
    await mockImage(tmp, w, h, o.seed);
    const bytes = await ctx.storage.putFile(o.key, tmp, "image/png");
    return upsertAsset(ctx.db, { userId: p.user_id, projectId: p.id, kind: "image", key: o.key, contentType: "image/png", bytes, width: w, height: h, source: "mock" });
  }
  const refUrls = await Promise.all(o.refs.map((k) => ctx.storage.url(k, 3600)));
  const endpoint = o.refs.length ? ctx.cfg.endpoints.image : ctx.cfg.endpoints.imageT2I;
  const input: Record<string, unknown> = {
    prompt: o.prompt, system_prompt: o.system, aspect_ratio: o.ar, resolution: o.res ?? "1K", seed: o.seed,
    num_images: 1, output_format: "png", limit_generations: true,
  };
  if (o.refs.length) input.image_urls = refUrls;
  const r = await ctx.fal.run(
    { projectId: p.id, sceneId: o.sceneId ?? null, revision: o.revision, kind: o.kind, endpoint, input, stableRefs: o.refs,
      estUsd: estimateUsd({ endpoint, images: 1 }) },
    { pick: (out) => out.images ?? [], keys: [o.key] });
  return upsertAsset(ctx.db, { userId: p.user_id, projectId: p.id, kind: "image", key: o.key, contentType: "image/png", source: `fal:${endpoint}`, sourceRequestId: r.jobId, meta: { ar: o.ar, d: d.ar } });
}

async function stepLockStyle(ctx: Ctx, p: ProjectRow): Promise<void> {
  const style = await styleFor(ctx, p);
  const title = p.title ?? p.input_text;
  if (!style.frameAsset) {
    await setDetail(ctx.db, p.id, "Painting the style frame…", 20);
    const assetId = await genImage(ctx, p, {
      kind: "image_style_frame", key: `u/${p.user_id}/styles/${style.id}/style_frame_${style.seed}.png`,
      prompt: `A single illustration that establishes the visual style for a short explainer titled "${title}". ` +
        `Show a simple, inviting establishing scene related to the topic. No text, no letters.`,
      system: style.system, refs: [], ar: dims(p).ar, seed: style.seed,
    });
    await ctx.db.query("update public.style_bibles set style_frame_asset_id = $2, is_locked = true where id = $1", [style.id, assetId]);
    style.frameAsset = assetId;
  }
  const frameKey = await assetKey(ctx.db, style.frameAsset);

  const { rows: chars } = await ctx.db.query<CharRow>("select id, ref_tag, name, description, sheet_asset_id, seed from public.characters where project_id = $1 order by ref_tag", [p.id]);
  for (const c of chars) {
    if (c.sheet_asset_id) continue;
    await setDetail(ctx.db, p.id, `Designing ${c.name}…`, 25);
    const assetId = await genImage(ctx, p, {
      kind: "image_character_sheet", key: `u/${p.user_id}/characters/${c.id}/sheet_v1.png`,
      prompt: `Image 1 is the STYLE reference — match its art style exactly. Create a character model sheet of ${c.name}: ${c.description}. ` +
        `Show the same character four times side by side: front view, three-quarter view, side profile, and a happy expression. ` +
        `Plain off-white background, consistent proportions and colours in every pose, no text or labels.`,
      system: style.system, refs: [frameKey], ar: "16:9", seed: Number(c.seed),
    });
    await ctx.db.query("update public.characters set sheet_asset_id = $2, is_locked = true where id = $1", [c.id, assetId]);
  }
  await setStatus(ctx.db, p.id, "narrating", "Recording the narration…", 30);
  await next(ctx, p.id);
}

// ---------------------------------------------------------------- 3. narration + alignment + scene timing
async function stepNarrate(ctx: Ctx, p: ProjectRow): Promise<void> {
  const { rows: sr } = await ctx.db.query<{ full_text: string }>("select full_text from public.scripts where id = $1", [p.current_script_id]);
  const text = sr[0]!.full_text;
  const tokens = tokenize(text);
  const narKey = pkey(p, "audio/narration.mp3");
  const work = join(ctx.cfg.tmpDir, p.id);
  await mkdir(work, { recursive: true });
  const narPath = join(work, "narration.mp3");

  const { rows: vr } = await ctx.db.query<{ provider: string; provider_voice_id: string; settings: { speed?: number } }>(
    "select provider, provider_voice_id, settings from public.voices where id = $1", [p.voice_id]);
  const voice = vr[0]!;

  let words: SttWord[];
  if (ctx.cfg.mode === "mock") {
    await mockTone(narPath, Math.max(5, tokens.length / 2.5), 330);
    const dur = (await probe(narPath)).durationMs / 1000;
    words = tokens.map((t, i) => ({ text: t, start: (i * dur) / tokens.length, end: ((i + 0.85) * dur) / tokens.length }));
  } else {
    // Fish TTS is free on the developer model; cache by project so replays don't re-voice
    let have = false;
    try { await writeFile(narPath, await ctx.storage.get(narKey)); have = true; } catch { /* not yet recorded */ }
    if (!have) {
      await setDetail(ctx.db, p.id, "Recording the narration…", 32);
      if (voice.provider !== "fish") throw new Error(`voice provider ${voice.provider} not wired in M1`);
      const audio = await fishTts(ctx.cfg.fishKey, ctx.cfg.fishModel, { text, referenceId: voice.provider_voice_id, speed: voice.settings?.speed });
      await writeFile(narPath, audio);
      await ctx.storage.put(narKey, audio, "audio/mpeg");
    }
    await setDetail(ctx.db, p.id, "Timing every word…", 36);
    const r = await ctx.fal.run(
      { projectId: p.id, kind: "stt_align", endpoint: ctx.cfg.endpoints.stt, input: { audio_url: await ctx.storage.url(narKey), language_code: p.language === "en" ? "eng" : p.language }, stableRefs: [narKey],
        estUsd: estimateUsd({ endpoint: ctx.cfg.endpoints.stt, seconds: 60 }) },
      { pick: () => [], keys: [] });
    words = ((r.raw.words ?? []) as { type?: string; text: string; start: number; end: number }[]).filter((w) => (w.type ?? "word") === "word");
  }
  const narProbe = await probe(narPath);
  if (ctx.cfg.mode === "mock") await ctx.storage.putFile(narKey, narPath, "audio/mpeg");
  await upsertAsset(ctx.db, { userId: p.user_id, projectId: p.id, kind: "audio", key: narKey, contentType: "audio/mpeg", durationMs: narProbe.durationMs, source: ctx.cfg.mode === "mock" ? "mock" : `fish:${ctx.cfg.fishModel}` });

  const aligned = alignTokens(tokens, words);
  await ctx.storage.put(pkey(p, "audio/alignment.json"), Buffer.from(JSON.stringify(aligned)), "application/json");
  const { rows: scenes } = await ctx.db.query<SceneRow>("select * from public.scenes where project_id = $1 order by idx", [p.id]);
  const timed = timeScenes(aligned, scenes.map((s) => ({ wordStart: s.word_start, wordEnd: s.word_end })));
  const lastEnd = Math.min(timed.at(-1)!.endMs, narProbe.durationMs + 600);
  for (const [i, t] of timed.entries()) {
    await ctx.db.query("update public.scenes set start_ms = $2, end_ms = $3 where id = $1",
      [scenes[i]!.id, t.startMs, i === timed.length - 1 ? Math.max(lastEnd, t.startMs + 500) : t.endMs]);
  }
  await setStatus(ctx.db, p.id, "generating_scenes", "Illustrating scenes…", 40);
  await next(ctx, p.id);
}

// ---------------------------------------------------------------- 4. keyframes + motion
async function stepScenes(ctx: Ctx, p: ProjectRow): Promise<void> {
  const style = await styleFor(ctx, p);
  const frameKey = await assetKey(ctx.db, style.frameAsset!);
  const { rows: chars } = await ctx.db.query<CharRow>("select id, ref_tag, name, description, sheet_asset_id, seed from public.characters where project_id = $1", [p.id]);
  const byId = new Map(chars.map((c) => [c.id, c]));
  const { rows: scenes } = await ctx.db.query<SceneRow>("select * from public.scenes where project_id = $1 order by idx", [p.id]);
  const d = dims(p);
  let done = scenes.filter((s) => s.status === "ready").length;

  const tagToName = (t: string) => t.replace(/CHAR_[A-Z]/g, (tag) => chars.find((c) => c.ref_tag === tag)?.name ?? tag);

  await Promise.all(scenes.map(async (s) => {
    if (s.status === "ready") return;
    const sc = s.character_ids.map((id) => byId.get(id)!).filter(Boolean);
    let keyframeAsset = s.keyframe_asset_id;
    if (!keyframeAsset) {
      await ctx.db.query("update public.scenes set status = 'keyframe_queued' where id = $1", [s.id]);
      const refs = [frameKey, ...await Promise.all(sc.map((c) => assetKey(ctx.db, c.sheet_asset_id!)))];
      const castLines = sc.map((c, i) => `Image ${i + 2} is ${c.name} (${c.ref_tag}): ${c.description}. Keep ${c.name}'s face, markings, colours and proportions identical to image ${i + 2}.`);
      const prompt = [
        "Image 1 is the STYLE reference — match its art style, palette and line work exactly.",
        ...castLines,
        `Scene: ${tagToName(s.visual_prompt)}.`,
        `Shot: ${s.shot_type}. ${d.ar === "9:16" ? "Vertical 9:16 composition" : "Widescreen 16:9 composition"}. Fill the entire frame edge to edge with the scene (no empty bands or borders); keep faces and key details out of the bottom fifth, where captions sit. No text or letters.`,
      ].join("\n");
      keyframeAsset = await genImage(ctx, p, {
        kind: "image_keyframe", key: pkey(p, `scenes/${String(s.idx).padStart(3, "0")}/r${s.revision}/keyframe.png`),
        prompt, system: style.system, refs, ar: d.ar, seed: Number(s.seed), sceneId: s.id, revision: s.revision,
      });
      await ctx.db.query("update public.scenes set keyframe_asset_id = $2, status = 'keyframe_ready' where id = $1", [s.id, keyframeAsset]);
    }

    if (s.animate && !s.clip_asset_id) {
      await ctx.db.query("update public.scenes set status = 'motion_queued' where id = $1", [s.id]);
      const sceneMs = (s.end_ms ?? 0) - (s.start_ms ?? 0) + 300; // + crossfade overlap
      const durS = requestDurationS(sceneMs, { min: 5, max: 15 });
      const clipKey = pkey(p, `scenes/${String(s.idx).padStart(3, "0")}/r${s.revision}/clip.mp4`);
      try {
        let clipAsset: string;
        if (ctx.cfg.mode === "mock") {
          const tmp = join(ctx.cfg.tmpDir, `mock_clip_${s.id}.mp4`);
          await mockVideo(tmp, 480, 854, durS, Number(s.seed));
          const bytes = await ctx.storage.putFile(clipKey, tmp, "video/mp4");
          clipAsset = await upsertAsset(ctx.db, { userId: p.user_id, projectId: p.id, kind: "video", key: clipKey, contentType: "video/mp4", bytes, source: "mock" });
        } else {
          const kfKey = await assetKey(ctx.db, keyframeAsset);
          const endpoint = ctx.cfg.endpoints.video;
          const r = await ctx.fal.run(
            { projectId: p.id, sceneId: s.id, revision: s.revision, kind: "video_motion", endpoint,
              input: { prompt: `${s.motion_prompt}. ${styleSuffix(style.spec)}`, image_url: await ctx.storage.url(kfKey), duration: durS,
                resolution: ctx.cfg.testMotionRes, seed: Number(s.seed), prompt_expansion_mode: "disabled" },
              stableRefs: [kfKey], estUsd: estimateUsd({ endpoint, seconds: durS, resolution: ctx.cfg.testMotionRes }) },
            { pick: (out) => (out.video ? [out.video] : []), keys: [clipKey] });
          clipAsset = await upsertAsset(ctx.db, { userId: p.user_id, projectId: p.id, kind: "video", key: clipKey, contentType: "video/mp4", source: `fal:${endpoint}`, sourceRequestId: r.jobId });
        }
        await ctx.db.query("update public.scenes set clip_asset_id = $2, status = 'ready' where id = $1", [s.id, clipAsset]);
      } catch (err) {
        if (err instanceof BudgetExceededError) throw err;
        // auto-degrade (docs/03 §3.2): keep the scene with Ken Burns instead of failing the video
        console.warn(`[scene ${s.idx}] motion failed, degrading to Ken Burns:`, (err as Error).message);
        await ctx.db.query("update public.scenes set animate = false, status = 'ready', error = $2 where id = $1",
          [s.id, JSON.stringify({ degraded: true, message: (err as Error).message })]);
      }
    } else {
      await ctx.db.query("update public.scenes set status = 'ready' where id = $1", [s.id]);
    }
    done++;
    await setDetail(ctx.db, p.id, `Illustrated ${done} of ${scenes.length} scenes…`, 40 + Math.round((done / scenes.length) * 40));
  }));

  await setStatus(ctx.db, p.id, "assembling", "Composing the music bed…", 82);
  await next(ctx, p.id);
}

// ---------------------------------------------------------------- 5. music
/** Each music model takes instrumental instructions differently. */
function musicInput(endpoint: string, prompt: string, seconds: number, seed: number): Record<string, unknown> {
  if (endpoint.includes("stable-audio")) {
    return { prompt: `${prompt}, instrumental background music`, negative_prompt: "vocals, singing, voice, speech, lyrics, choir",
      duration: seconds, seed, output_format: "wav" };
  }
  if (endpoint.includes("elevenlabs/music")) return { prompt, music_length_ms: seconds * 1000, force_instrumental: true, seed };
  if (endpoint.includes("minimax/music")) return { prompt: `${prompt}. Instrumental only, no vocals.`, lyrics: "[intro]\n[instrumental]\n[outro]", duration: seconds, seed };
  return { prompt, duration: seconds, seed };
}
async function stepMusic(ctx: Ctx, p: ProjectRow): Promise<void> {
  if (p.music) {
    const { rows } = await ctx.db.query<{ total: number }>("select max(end_ms)::int as total from public.scenes where project_id = $1", [p.id]);
    const seconds = Math.ceil((rows[0]!.total ?? 30000) / 1000) + 1;
    const key = pkey(p, "audio/music_bed.wav");
    if (ctx.cfg.mode === "mock") {
      const tmp = join(ctx.cfg.tmpDir, `mock_music_${p.id}.wav`);
      await mockTone(tmp, seconds, 110);
      await ctx.storage.putFile(key, tmp, "audio/wav");
    } else {
      const { rows: mr } = await ctx.db.query<{ music_prompt: string | null }>("select research->>'music_prompt' as music_prompt from public.scripts where id = $1", [p.current_script_id]);
      const prompt = mr[0]?.music_prompt ?? "light, curious instrumental underscore, no vocals";
      const endpoint = ctx.cfg.endpoints.music;
      await ctx.fal.run(
        { projectId: p.id, kind: "music_bed", endpoint, input: musicInput(endpoint, prompt, seconds, Number(p.project_seed) % 2147483647),
          stableRefs: [], estUsd: estimateUsd({ endpoint, seconds, images: 1 }) },
        { pick: (out) => (out.audio ? [out.audio] : []), keys: [key] });
    }
    await upsertAsset(ctx.db, { userId: p.user_id, projectId: p.id, kind: "audio", key, contentType: "audio/wav", source: ctx.cfg.mode === "mock" ? "mock" : `fal:${ctx.cfg.endpoints.music}` });
  }
  await setStatus(ctx.db, p.id, "rendering", "Rendering the final video…", 88);
  await next(ctx, p.id);
}

// ---------------------------------------------------------------- 6. render
async function stepRender(ctx: Ctx, p: ProjectRow): Promise<void> {
  const d = dims(p);
  const work = join(ctx.cfg.tmpDir, p.id, "render");
  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });
  const fetchTo = async (key: string, name: string) => { const path = join(work, name); await writeFile(path, await ctx.storage.get(key)); return path; };

  const { rows: scenes } = await ctx.db.query<SceneRow>("select * from public.scenes where project_id = $1 order by idx", [p.id]);
  const rscenes = [];
  for (const s of scenes) {
    const useClip = s.animate && s.clip_asset_id;
    const key = await assetKey(ctx.db, (useClip ? s.clip_asset_id : s.keyframe_asset_id)!);
    rscenes.push({ path: await fetchTo(key, `s${s.idx}${useClip ? ".mp4" : ".png"}`), type: (useClip ? "clip" : "kenburns") as "clip" | "kenburns",
      durMs: (s.end_ms ?? 0) - (s.start_ms ?? 0), seed: Number(s.seed) });
  }
  const narration = await fetchTo(pkey(p, "audio/narration.mp3"), "narration.mp3");
  const music = p.music ? await fetchTo(pkey(p, "audio/music_bed.wav"), "music.wav") : null;
  const words: AlignedWord[] | null = p.subtitles ? JSON.parse((await ctx.storage.get(pkey(p, "audio/alignment.json"))).toString("utf8")) : null;

  const out = join(work, "master.mp4");
  const edl = await render({ workdir: work, width: d.w, height: d.h, scenes: rscenes, narrationPath: narration, musicPath: music, words,
    captionStyle: p.format === "short_9x16" ? "pop_word" : "phrase", outPath: out });
  const meta = await probe(out);

  const { rows } = await ctx.db.query<{ id: string }>(
    "insert into public.renders (project_id, kind, aspect, resolution, edl, status) values ($1,'master',$2,$3,$4,'in_progress') returning id",
    [p.id, d.ar, `${d.w}x${d.h}`, JSON.stringify(edl)]);
  const renderId = rows[0]!.id;
  const key = pkey(p, `renders/${renderId}/master_${d.ar.replace(":", "x")}_${d.w}x${d.h}.mp4`);
  const bytes = await ctx.storage.putFile(key, out, "video/mp4");
  const assetId = await upsertAsset(ctx.db, { userId: p.user_id, projectId: p.id, kind: "video", key, contentType: "video/mp4", bytes, width: meta.width, height: meta.height, durationMs: meta.durationMs, source: "render" });
  if (edl.captions) {
    const assKey = pkey(p, `renders/${renderId}/captions.ass`);
    await ctx.storage.putFile(assKey, join(work, "captions.ass"), "text/plain");
  }
  await ctx.db.query("update public.renders set asset_id = $2, status = 'succeeded' where id = $1", [renderId, assetId]);
  await ctx.db.query("update public.projects set final_render_id = $2, status = 'completed', status_detail = 'Done', progress = 100 where id = $1", [p.id, renderId]);
  // poster frame for the project card
  const poster = join(work, "poster.jpg");
  await ffmpeg(["-ss", "1", "-i", out, "-frames:v", "1", "-vf", "scale=540:-1", poster]).catch(() => undefined);
  await ctx.storage.putFile(pkey(p, `renders/${renderId}/poster.jpg`), poster, "image/jpeg").catch(() => undefined);
}
