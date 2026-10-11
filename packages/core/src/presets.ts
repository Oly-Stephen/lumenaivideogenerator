// Our own style preset catalog (docs/03 §4). Written from scratch — not derived from any third-party presets.

export interface StyleSpec {
  medium: string;
  palette: string[];
  line: string;
  shading: string;
  texture: string;
  lighting: string;
  composition: string;
  cameraGrammar: string[];
  negatives: string[];
}

export interface StylePreset {
  key: string;
  name: string;
  blurb: string;
  spec: StyleSpec;
}

const COMMON_NEGATIVES = ["photorealism", "watermarks", "logos", "brand names", "garbled text", "extra fingers", "deformed hands"];

export const STYLE_PRESETS: StylePreset[] = [
  {
    key: "flat_editorial",
    name: "Flat Editorial",
    blurb: "Clean vector shapes, confident colour blocks — magazine explainer.",
    spec: {
      medium: "flat 2D vector illustration, editorial explainer",
      palette: ["#1F2A44", "#F2E8CF", "#E76F51", "#2A9D8F", "#E9C46A"],
      line: "uniform 3px dark navy outlines with rounded joins",
      shading: "flat fills plus one soft cel shadow, no gradients",
      texture: "subtle paper grain at very low opacity",
      lighting: "even, high-key",
      composition: "rule of thirds, generous negative space",
      cameraGrammar: ["slow push-in", "gentle lateral pan", "parallax layers"],
      negatives: [...COMMON_NEGATIVES, "3D render", "heavy gradients"],
    },
  },
  {
    key: "chalk_sketch",
    name: "Chalkboard Sketch",
    blurb: "Hand-drawn chalk lines on a deep green board.",
    spec: {
      medium: "hand-drawn chalk illustration on a dark green chalkboard",
      palette: ["#1E3B2F", "#F4F1E8", "#F2C14E", "#7FC8F8", "#F28B82"],
      line: "dusty chalk strokes with slight wobble",
      shading: "hatching and smudged chalk fills",
      texture: "visible chalk dust and board scuffs",
      lighting: "flat",
      composition: "centered diagrams with labelled arrows",
      cameraGrammar: ["slow push-in", "pan across the board"],
      negatives: [...COMMON_NEGATIVES, "glossy surfaces", "3D render"],
    },
  },
  {
    key: "paper_cutout",
    name: "Paper Cut-out",
    blurb: "Layered coloured paper with soft drop shadows.",
    spec: {
      medium: "layered cut-paper collage, handmade diorama look",
      palette: ["#F7EDE2", "#F5CAC3", "#84A59D", "#F28482", "#3D405B"],
      line: "no outlines; shapes defined by cut paper edges",
      shading: "soft drop shadows between paper layers",
      texture: "matte paper fibres",
      lighting: "warm top-down studio light",
      composition: "stacked depth layers, foreground framing",
      cameraGrammar: ["parallax between paper layers", "slow tilt"],
      negatives: [...COMMON_NEGATIVES, "glossy plastic", "sharp vector lines"],
    },
  },
  {
    key: "ink_wash",
    name: "Ink & Wash",
    blurb: "Loose ink lines with watercolour washes.",
    spec: {
      medium: "pen-and-ink drawing with loose watercolour washes",
      palette: ["#22223B", "#F2E9E4", "#C9ADA7", "#4A6FA5", "#D68C45"],
      line: "expressive variable-width ink lines",
      shading: "transparent watercolour washes, blooms at edges",
      texture: "cold-press watercolour paper",
      lighting: "soft natural daylight",
      composition: "vignetted scenes with white paper margins",
      cameraGrammar: ["slow push-in", "gentle drift"],
      negatives: [...COMMON_NEGATIVES, "3D render", "neon colours"],
    },
  },
  {
    key: "isometric_clean",
    name: "Isometric Clean",
    blurb: "Tidy isometric world-building for systems and processes.",
    spec: {
      medium: "isometric 2D vector illustration, 30-degree projection",
      palette: ["#0B132B", "#F8F9FA", "#3A86FF", "#FFBE0B", "#8338EC"],
      line: "thin consistent outlines",
      shading: "three-tone face shading per object",
      texture: "none, crisp",
      lighting: "light from top-left",
      composition: "objects on a floating isometric tile",
      cameraGrammar: ["slow orbit-like pan", "push-in on detail"],
      negatives: [...COMMON_NEGATIVES, "perspective distortion", "photographic textures"],
    },
  },
  {
    key: "comic_halftone",
    name: "Comic Halftone",
    blurb: "Bold ink, halftone dots, punchy panels.",
    spec: {
      medium: "retro comic-book illustration with halftone shading",
      palette: ["#111111", "#FFF8E7", "#E63946", "#457B9D", "#F4A261"],
      line: "thick black brush outlines",
      shading: "halftone dot shading, spot blacks",
      texture: "slightly yellowed newsprint",
      lighting: "dramatic, high contrast",
      composition: "dynamic diagonals",
      cameraGrammar: ["punch-in", "quick pan"],
      negatives: [...COMMON_NEGATIVES, "speech bubbles with text", "3D render"],
    },
  },
];

export function getPreset(key: string): StylePreset {
  const p = STYLE_PRESETS.find((s) => s.key === key);
  if (!p) throw new Error(`unknown style preset ${key}`);
  return p;
}

/** System prompt sent with every image call so the style is pinned (docs/03 §4.1). */
export function renderStyleSystemPrompt(spec: StyleSpec): string {
  return [
    `Art style (must be identical in every image): ${spec.medium}.`,
    `Palette: ${spec.palette.join(", ")} — use only these colours and their tints.`,
    `Line work: ${spec.line}. Shading: ${spec.shading}. Texture: ${spec.texture}. Lighting: ${spec.lighting}.`,
    `Composition: ${spec.composition}. Fill the entire frame edge to edge with the scene (no empty bands or borders); keep faces and key details out of the bottom fifth, where captions sit.`,
    `Never include: ${spec.negatives.join(", ")}. Do not draw any words or letters unless explicitly asked.`,
  ].join("\n");
}

/** Short suffix for motion prompts. */
export function styleSuffix(spec: StyleSpec): string {
  return `Maintain the exact ${spec.medium} look of the first frame; same colours, same line work; no new characters; no text.`;
}
