# 04 — UI/UX Research and Redesign Plan

Status: research complete, **awaiting approval before any UI code changes**.
Date: 2026-10-11.

## 0. Inputs

**Design skills installed in `.claude/skills/`.** All are MIT-licensed; their origins are recorded in `SOURCES.md`.

| Skill | What we take from it |
|---|---|
| `apple-design` (Emil Kowalski) | How the app should feel to use: feedback appears the moment you press, motion is a spring that can be interrupted, translucent bars show depth, type tracking changes with size, reduced motion is respected, and Apple's 8 principles (Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight). |
| `design-taste-frontend` (Leonxlnx) | Habits that make a UI look AI-generated, and what to do instead: no purple glow, Inter is not the default font, one locked accent colour, one corner-radius scale, real loading/empty/error states, labels above inputs, no em-dashes in UI text, no decorative status dots. Its landing-page sections apply only to our signed-out home page. |
| `hig-foundations`, `hig-patterns` (Raintree) | Apple's guidance on loading and progress ("show something as soon as possible", "let people do other things while they wait"), feedback, modality, undo, writing style, colour and dark mode. |

**Market research.** These are public sources only.

- **AI UX pattern catalog.** The patterns that apply to us:
  - Cost Transparency, Running Meters, Hard Budget Ceilings.
  - Processing Time Estimates, Human in the Loop, Variation Picker.
  - Failure Disclosure, Source Browser.
  - Checkpoints and Restore, Skeleton Screens.
- **LTX Studio.** Its storyboard is the closest match to our review flow. The script is broken into scenes, and you can edit, merge or split them for free before anything is generated. Characters are pulled out and editable, and each scene keeps revisions you can roll back to.
- **Pictory, Synthesia and Descript.** Pictory uses scene cards with per-scene swaps. Synthesia and Descript are text-first: you change the video by editing the script.
- **Runway and Pika.** Users complain about credit costs they can't predict. Pika's cost changes with model, length and resolution, which reviewers call "almost impossible to guess". Our flow already estimates cost before generating, which is a real advantage, so the UI should make it obvious.
- **Higgsfield.** From `docs/01`, public pages only:
  - Single composer screen with an estimate on the Generate button.
  - Stage labels in history cards, refunds on failure.
  - We do **not** copy any of its layout, copy or branding.

## 1. Design read

> **Reading this as:** a creator tool (make → review → watch) for solo YouTube/Shorts creators, using a calm, Apple-like product language. It leans toward Tailwind v4 CSS tokens, the Geist font, Phosphor icons, and restrained spring motion.

These are the taste-skill dials. They are lower than its defaults because this is a product UI, not a landing page.

| Dial | Value | Why |
|---|---|---|
| DESIGN_VARIANCE | 4 | Predictable layouts: people come back to the same screens every day. |
| MOTION_INTENSITY | 3 | Motion only to explain state changes, with no decorative loops. |
| VISUAL_DENSITY | 4 | Everyday app spacing, except the storyboard, which is denser. |

The signed-out landing page uses 6 / 5 / 3.

## 2. Findings → principles for Lumen

1. **Show the cost before every spend, not after.**
   - The estimate in credits appears on every button that spends, e.g. "Generate · 214 credits".
   - Balance after the spend appears next to it.
   - Toggling motion on a scene updates the total live.
   - This is our main differentiator against Pika/Runway complaints (Cost Transparency, Hard Budget Ceilings).
2. **Approve structure while it's cheap.**
   - The script and the storyboard are free to edit, and only "Generate" costs anything.
   - The UI should say that plainly ("Editing is free. Credits are used when you generate."), as LTX does.
3. **The video is the hero; chrome is quiet.**
   - Neutral surfaces, a single accent, media at full bleed in its own aspect ratio.
   - Translucent sticky header (apple-design §12).
4. **Waiting is a feature, not a spinner.**
   - Show real pipeline stages with the current one highlighted: Writing → Storyboard → Style → Voice → Scenes → Music → Final cut.
   - Keyframes fill in one by one as they arrive: "show something as soon as possible" (HIG Loading).
   - Show a time estimate.
   - Let people leave: the library card shows live progress.
5. **Every state is designed.** Each screen needs empty, loading (skeleton shaped like the result), error, paused and canceled states.
   - Errors explain what happened and what was refunded (Failure Disclosure).
   - Each error has one clear action.
6. **Forgiveness over confirmation.**
   - Keep confirm dialogs only for Cancel (irreversible) and for spends above an estimate.
   - Redo keeps the old version, so there's a version strip with "Use previous" (Checkpoints and Restore).
7. **Show the claims' sources.** Script review shows each claim with its source domain, and flags weak sources (Source Browser). This fits Responsibility in Apple's principles.
8. **Common path first, advanced one level deeper.**
   - Create needs only Topic, Format and Generate.
   - Style, voice, quality, autopilot and high-quality writing sit behind "Options", with sensible defaults shown as a summary line.
9. **Respond on press.** Buttons scale to 0.97 on `:active` with a 100 ms transition. Every action has an optimistic state; no `alert()` boxes, use inline messages and toasts.
10. **Accessible by default.**
    - WCAG AA contrast, visible focus rings.
    - `prefers-reduced-motion` gives cross-fades only.
    - `prefers-reduced-transparency` gives solid bars.
    - Both light and dark themes are tested.

## 3. Current UI audit

The current UI is functional but not designed.

| Issue | Where | Rule broken |
|---|---|---|
| `alert()` and `confirm()` for errors and cancel | `ProjectLive.tsx` | Feedback should be inline (HIG Feedback) |
| One thin progress bar plus raw `status_detail` text | `ProjectLive.tsx` | Stages and partial results are not shown (HIG Loading) |
| System font, no type scale, no tracking rules | `globals.css` | apple-design §15 |
| No icons; "← All videos" uses a text arrow | all | taste §3.C |
| Middle-dot chains: "Short · 9:16 · standard · estimate 214 cr · spent 30 cr" | project header | taste §9.F (dot rationing) |
| Em-dashes in UI copy | home page, credits page | taste §9.G |
| No skeletons; a blank page until data arrives | all | taste §4.5 |
| Library is a plain text list with no thumbnails | `page.tsx` | The video should be the hero |
| The create form shows every option at once | `CreateForm.tsx` | Common path first |
| Accent `#2a9d8f` is OK, but there are no semantic tokens (surface, border, danger…) | `globals.css` | taste §8.A |

## 4. Design system

### Tokens
CSS variables in `globals.css`, exposed to Tailwind v4 through `@theme inline`.

- **Neutrals:** a cool zinc family. Off-white `#fafafa` and off-black `#0b0b0d`, never pure white or black.
  - surface: `--bg`, `--surface`, `--surface-2`
  - text: `--fg`, `--fg-muted`
  - border: `--border`
- **Accent:** one only. We keep a deepened teal, about `#0f8a7e` (dark mode about `#3cc2b2`), checked for AA on white text, and use it for primary actions and progress.
- **Semantic colours:** `--danger` and `--warning`, used only for real states.
- **Radius scale:** controls 10px, cards and media 14px, pills full. This is the only radius rule.
- **Shadows:** tinted to the background hue and used only for floating layers (sheets, popovers, sticky bar).
- **Type:** Geist Sans and Geist Mono, loaded through `next/font/google` (built into Next.js, no package needed).
  - Display: 30–36px with −0.02em tracking and 1.1 line-height.
  - Body: 15–16px with tracking 0 and 1.5 line-height.
  - Numbers (credits, durations) use `tabular-nums`.
- **Icons:** `@phosphor-icons/react@2.1.10` (May 2025, older than the 2-week rule), regular weight, one family. This is the **only new dependency**, and it needs your OK.
- **Motion:** CSS only, no Motion library, because 3/10 intensity doesn't need it.
  - Easing: `cubic-bezier(0.32, 0.72, 0, 1)`, 200–300 ms.
  - Press: `scale(.97)`.
  - Sheets: slide plus fade.
  - Under reduced motion, everything becomes a 150 ms cross-fade.

### Components
Built in `apps/web/components/ui/`, roughly 10 small files with no UI framework:
- `Button` (primary, secondary, ghost, danger; with a busy state)
- `Field` (label above, helper text, error below)
- `Segmented` (Short/Full, Budget/Standard/Premium)
- `Sheet` (bottom on mobile, right side on desktop)
- `Toast`
- `Skeleton`
- `CostPill`
- `StageTracker`
- `MediaFrame` (aspect-aware, with a skeleton)
- `EmptyState`

## 5. Screens

**App shell**
- Translucent sticky top bar with:
  - wordmark on the left
  - **Library** and **Credits** nav
  - the credit balance as a pill (live), with a low-balance hint
  - an account menu
- At phone width, the nav collapses into the balance pill and a menu.

**Signed-out home (landing).**
- Left-aligned hero: headline (≤ 8 words), one line of subtext (≤ 20 words), one CTA "Sign in".
- To the right, a real rendered Short from our own pipeline (the cat or sleep video) in a 9:16 frame, autoplaying muted and looping, with a poster frame.
- Below it, three sections:
  1. how it works, as the real stage names with stills from a real project
  2. what it costs ("Every video shows its price before you generate")
  3. the formats
- No fake UI screenshots.

**Library (`/`).**
- Grid of cards with a thumbnail (first keyframe, or the final poster) in the right aspect ratio.
- Each card shows the title, format icon and a relative date.
- In-progress cards show a stage label and a thin progress line. Failed and paused cards show a small inline badge.
- Empty state: one sentence plus a "New video" button, with 3 topic starters (Prompt Starters).
- Skeleton grid while loading.

**Create (`/new`).** This is a composer.
- Large text area: "What should the video explain?"
  - Below it, a `Segmented` control for Topic vs My script, and another for Short (9:16) vs Full (16:9).
- "Options" is a collapsible summary row ("Budget · Clean flat · Ethan · Approvals on"). It opens to:
  - style preset cards, with thumbnails generated once from our pipeline (an asset we own)
  - voice with a preview play button
  - quality
  - autopilot
  - high-quality writing
- Sticky footer: estimate range ("about 90–140 credits") and balance, then **Generate script** ("free to review before generating video").

**Script review.**
- A readable column, max 65ch, with the narration in an editable text area.
- Live word count and estimated length ("31 s of 30 s target").
- Claims list: each claim with its source domain as a link, and a warning icon on weak sources.
- Footer: "Save changes" (secondary) and **Approve script** (primary).
- A light note: "Editing is free."

**Storyboard (plan review).** This is the core screen.
- **Desktop:** two columns.
  - Left: scene cards in a vertical list. Each card shows:
    - index and time range
    - narration excerpt
    - visual description
    - shot type
    - a "Motion" toggle with its credit delta (e.g. "+25")
  - Right (sticky): the cost breakdown as a list of line items, total, balance after, the quality segmented control, and **Generate video · 214 credits**.
- **Mobile:** the cost panel becomes a sticky bottom bar that opens into a sheet.
- Characters appear as a small strip at the top.
- If credits are insufficient, the button is disabled, the shortfall is shown inline, and there's a link to Credits.

**Generating.**
- A `StageTracker` along the top: completed stages get a check, the current one shows a subtle animated progress line, and the rest are muted. Each stage has a plain label and the current `status_detail` underneath, e.g. "Animating scene 4 of 9".
- Below, the storyboard grid in final aspect ratio:
  - each keyframe fades in as it lands
  - pending scenes show a skeleton
  - animated scenes get a small play glyph once their clip exists
- Shows "About 3 min left" (estimated from scene count and history) and "You can leave this page. Progress continues in your Library."
- Cancel is a quiet secondary button that opens a confirm sheet stating what gets refunded.

**Result.**
- The player is centred and as large as the viewport allows (9:16 max 72vh; 16:9 full width), with a poster frame.
- Actions row: **Download MP4** (primary), Copy title, Show script.
- Scenes strip under the player:
  - clicking a scene seeks the player to its start time
  - each scene has a "Redo" button that opens a sheet with: what to redo (Image / Motion / Both); an editable prompt; "New variation" (on by default); the cost; and **Redo · 30 credits**
  - after a redo, the scene shows a version switcher (v1, v2) and "Use v1" if the new one is worse. Restoring an earlier version needs a small backend RPC, so it's listed as optional below.
- Spend summary as one quiet line: "Used 187 of 214 held credits. 27 returned."

**Failed / paused.**
- An inline panel at the top with a warning icon, plain-language cause, what was refunded, and one primary action (Retry or Add credits).
- No raw error strings by default; a "Details" disclosure shows the technical message.

**Credits.**
- Large balance number, then a ledger list grouped by video:
  - collapsed shows "Sleep video: 187 used, 27 returned"
  - expanded shows the holds, charges and releases
- Includes the explainer sentence about holds.

**Login.**
- Centred card on a quiet background.
- Email with a label above, the magic-link button, and a sent state with the address echoed back.

## 6. UX writing rules

From HIG Writing and taste §9.

- Plain verbs, sentence case, no em-dashes in UI text.
- Avoid "Elevate/Unleash/Seamless".
- One label per intent: "New video" everywhere, not "Create" in one place and "New project" in another.
- Credits are written as "214 credits", never "cr".
- Errors say what happened, then what to do: "Couldn't reach the image service. Nothing was charged. Try again."

## 7. Implementation plan

Order, after approval:

1. **Foundation**
   - tokens and `globals.css`
   - Geist via `next/font`
   - install `@phosphor-icons/react@2.1.10`
   - `components/ui/*`
   - app shell and top bar
2. **Library + Create:** the composer, Options disclosure, live estimate range, and a create preview using `estimateProject` from `@lumen/core`.
3. **Script review + Storyboard:** the two-column cost panel and the mobile sheet.
4. **Generating + Result:** the stage tracker, keyframes filling in, player with scene seek, the Redo sheet, and the spend summary.
5. **Failed/paused states, Credits grouping, Login.**
6. **Signed-out landing,** using our own rendered Short as the hero media.
7. **Checks:**
   - light and dark at 375 / 768 / 1280 widths in the browser preview
   - reduced motion
   - keyboard focus order
   - contrast spot-check
   - taste pre-flight: no em-dash, no AI purple, one accent, one radius scale
   - `tsc`
   - mock E2E still 13/13

No backend changes are needed except **optional** steps 4b and 5b:
- **4b:** an `rpc_restore_scene_revision`, to roll a scene back to an earlier version.
- **5b:** a time-left estimate. It can be computed in the client from the job history, so no backend change is needed for it.

## Sources
- [AI UX Playground: pattern catalog](https://www.aiuxplayground.com/patterns), [Cost Transparency](https://www.aiuxplayground.com/pattern/cost-transparency)
- [LTX Storyboard Generator update](https://ltx.studio/blog/ltx-storyboard-generator-update), [LTX Studio deep dive (CineD)](https://cined.com/ltx-studio-deep-dive-the-first-ai-based-full-editing-suite)
- [Pika pricing explained (eesel)](https://www.eesel.ai/blog/pika-ai-pricing), [Runway review (devtoollab)](https://devtoollab.com/ai-tools/runway-ai)
- [Descript vs Pictory (Swell AI)](https://www.swellai.com/blog/descript-vs-pictory)
- [Adobe Firefly generative credits](https://www.adobe.com/learn/firefly/web/generative-credits-overview)
- [Google Cloud: how to build a GenAI application](https://cloud.google.com/blog/products/ai-machine-learning/how-to-build-a-genai-application)
- Apple HIG [Loading](https://developer.apple.com/design/human-interface-guidelines/loading), [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback), via `hig-patterns`
- Skills: [emilkowalski/skills](https://github.com/emilkowalski/skills), [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), [raintree-technology/apple-hig-skills](https://github.com/raintree-technology/apple-hig-skills)
