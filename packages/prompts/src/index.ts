// Prompt templates T1–T3 (docs/03 §7). Written for this project; versioned so jobs record which wording produced them.

export const PROMPT_VERSION = "m2-2026-10-12";

// ---------------------------------------------------------------- T1 research
export const RESEARCH_SYSTEM = `You are the research producer for short educational explainer videos.
Your job is to find angles on a topic that are true, specific, and genuinely surprising to a general audience.
Use web search to check facts. Prefer primary sources (journals, universities, official agencies) and reputable outlets.
Every factual claim you report must come with the URL of a page that supports it. If you cannot support a claim, leave it out.`;

export function researchUser(o: { topic: string; durationS: number; language: string; audience?: string }): string {
  return `Topic: "${o.topic}"
Audience: ${o.audience ?? "curious general audience"}. Language of the final video: ${o.language}.
Video length: about ${o.durationS} seconds.

Research the topic, then reply with:
1. Five candidate angles. For each: a one-line premise, the single most surprising true fact, why a viewer would care within 3 seconds,
   and scores from 1 to 10 for curiosity, clarity (can it be explained in ${o.durationS} s?), visual potential, and evidence strength.
2. Your pick, with a one-sentence reason.
3. Research notes for the scriptwriter: 6–12 short factual bullet points, each ending with its source URL in parentheses.
Keep it plain text, no tables.`;
}

// ---------------------------------------------------------------- T2 script
export const SCRIPT_SYSTEM = `You write narration for faceless explainer videos.
Write for the ear: plain words, short sentences, no filler, no greetings, no "like and subscribe".
Every factual claim must be supported by the research notes you are given; if it is not, leave it out.
Never invent statistics, quotes, names, or dates.`;

export function scriptUser(o: { notes: string; topic: string; format: "short" | "full"; targetWords: number }): string {
  const structure =
    o.format === "short"
      ? `One arc: hook → two or three escalating beats → a closing line that reframes the hook. Use exactly one chapter.`
      : `Three to six chapters with one-line titles. End each chapter with a question or promise the next chapter resolves.
Place a curiosity hook roughly every 140 words.`;
  return `Topic: ${o.topic}
Research notes (the only facts you may use):
${o.notes}

Write the narration.
- Length: ${o.targetWords} words, give or take 8%. Count carefully.
- The first sentence is the payoff or the most striking fact, at most 14 words.
- ${structure}
- full_text must be exactly the narration that will be spoken, beats joined by single spaces.
- on_screen_terms: at most 6 short terms worth showing as text.
- pronunciation_hints: unusual names only.
- claims: every factual claim in the narration, each with the supporting source URL from the notes.`;
}

// ---------------------------------------------------------------- T3 scene plan
export const PLAN_SYSTEM = `You are a storyboard artist for 2D explainer videos.
You turn narration into shots that SHOW the idea — visual metaphors, simple diagrams, cause and effect — not literal talking heads.
One idea per shot. Describe concrete, drawable things. Never ask for written words, labels, logos, brand names, or real people's likenesses.`;

export function planUser(o: {
  indexedTokens: string; // "0:Your 1:cat's 2:purr ..."
  tokenCount: number;
  aspect: "9:16" | "16:9";
  styleSummary: string;
  sceneSeconds: [number, number];
  maxScenes: number;
}): string {
  return `Narration tokens (index:word):
${o.indexedTokens}

Total tokens: ${o.tokenCount}. Speaking pace is about 2.5 words per second.
Aspect ratio: ${o.aspect}. Art style: ${o.styleSummary}.

Plan the scenes.
- Scenes cover contiguous token ranges: the first starts at 0, each next starts at the previous word_end + 1, the last ends at ${o.tokenCount - 1}.
- Each scene lasts roughly ${o.sceneSeconds[0]}–${o.sceneSeconds[1]} seconds of speech (about ${Math.round(o.sceneSeconds[0] * 2.5)}–${Math.round(o.sceneSeconds[1] * 2.5)} words); cut at sentence or clause boundaries.
- At most ${o.maxScenes} scenes.
- Define 0–2 recurring characters only if they help (ref_tag CHAR_A, CHAR_B). Each description: a frozen, specific visual description
  (species or person type, build, colours, clothing, one distinctive accessory), 20–60 words, no names of real people.
- visual_prompt: what is in the frame, style-agnostic, concrete, under 60 words; refer to characters by their ref_tag.
- motion_prompt: camera and subject motion in under 25 words (e.g. "slow push-in; leaves drift").
- shot_type: wide, medium, close, diagram or text_card. Vary them.
- animate_priority 0–1: how much the scene benefits from real motion.
- music_prompt: an instrumental underscore that fits the tone, no vocals.`;
}

export function indexTokens(tokens: string[]): string {
  return tokens.map((t, i) => `${i}:${t}`).join(" ");
}
