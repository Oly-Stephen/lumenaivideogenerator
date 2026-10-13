# Brand Identity Research Report

**Product:** the AI explainer-video app currently called "Lumen".
**Research date:** 13 October 2026. Every domain, trademark and website check in this report was run on that date.
**Scope:** research and planning only. No application code, styles, logos or landing pages were changed, and nothing was purchased or deployed.

**Evidence labels used throughout:**
- **[Verified]** — checked directly against a primary source today (a domain registry, a trademark office database, or the live website). The method is noted alongside.
- **[Source]** — taken from published third-party material, cited inline.
- **[Interpretation]** — professional judgement drawn from the evidence.
- **[Hypothesis]** — untested. It needs user research or legal review before anyone relies on it.

Raw evidence is in [`data/`](data/):
- registry results: `domains_round1…7.json`
- the competitor style audit: `competitor-audit.md`
- the scripts used for the checks: `rdap_check.py`, `parked.py`

---

## 1. Executive summary

1. **"Lumen" must be replaced. This is the most urgent finding.**
   - **[Verified]** USPTO record: **LUMEN5** is a live, registered US trademark (Reg. No. 6,245,561, serial 90075778, class 42). Its goods are "Software as a service… for creating, publishing and sharing videos online and for turning texts, photos…". That is our exact category.
   - **[Verified]** lumen.com belongs to Lumen Technologies, a large telecom company.
   - **[Verified]** lumen.com, lumen.ai, lumen.app and lumen.io are all registered.
   - **[Verified]** USPTO holds 1,421 records containing "LUMEN".
   - **Conclusion:** the name is crowded, unownable, and likely to cause confusion with a direct competitor.

2. **Recommended name: Kamibai.** The name is a MUJI-style shortening of *kamishibai* (紙芝居, "paper play").
   - **What it refers to [Source]:** Japanese street storytelling in which a narrator tells a story while sliding illustrated cards through a small wooden frame ([Japan Society](https://aboutjapan.japansociety.org/the-many-faces-of-kamishibai), [Wikipedia](https://www.wikipedia.org/wiki/Kamishibai)).
   - **The link to TV [Source]:** when television reached Japan in the 1950s, people called it *denki kamishibai*, "electric kamishibai".
   - **Why it fits:** our product is exactly a narrated sequence of illustrated scenes, so the name tells the product's own story.
   - **Domains [Verified, RDAP]:** **kamibai .com, .ai, .app, .io, .video, .studio and .co are all unregistered.**
   - **US trademarks [Verified]:** no "KAMIBAI" record. One similar mark, **KAMIKAI** (class 42, Ikhor Inc.), needs a lawyer's opinion.
   - **EU/international trademarks [Verified]:** TMview returns no rows for "kamibai".
   - **Existing use [Verified]:** no business found using the name.

3. **Recommended identity: "Paper Theater, Apple-clean"** (§14A, refined at the user's request for an Apple/Google-like look).
   - **Colour:** white and ink neutrals, with **one** accent: seal red `#C73A28`. The user's videos supply all other colour, as Apple's product photos do.
   - **Type:** Geist throughout.
   - **Symbol:** one monochrome silhouette, a frame with a small "card" notch, which plays the role of Apple's bite.
   - **Motion:** a card-slide transition.
   - **Layout:** one idea per screen.
   - **Voice:** short and calm. Tagline "Explain anything."
   - **Why it stands out:**
     - **[Verified]** None of the 15 competitors audited uses this palette or this metaphor.
     - **[Verified]** Competitors cluster around near-black plus a neon accent (Higgsfield, VEED, Revid), purple or indigo (Lumen5, Pictory, Steve AI, Synthesia's navy), and Inter type.

4. **Best non-Japanese name: Teatrino** (Italian, "little theatre"; see §5.5).
   - **The .com** is for sale at **$3,095**. The .ai, .app, .io, .video and .co extensions are unregistered.
   - **No live US trademarks** in software, education or SaaS (classes 9, 41, 42).
   - **It carries the same paper-theater idea**, so the recommended identity works with either name.

5. **Runner-up names:** Oriflick and Unplica. Both have every checked domain free, including .com, and clean results in USPTO and TMview. They are the fallbacks if the Japanese-derived direction is rejected; see chapters 5 and 6.

6. **Before committing to any name:** have a trademark attorney run a full clearance search in classes 9, 41 and 42. Also get a native Japanese speaker to review the name and story, covering both meaning and cultural respect; see chapter 6.

---

## 2. Product and audience analysis

The product was studied read-only, from the code and from `docs/01–04`.

| Question | Finding |
|---|---|
| What it does | Turns a topic or script into a narrated explainer video: research → script → storyboard → images → motion → voice → music → captions → render. Formats: Short (9:16) and Full (16:9). |
| Problem solved | Explainer videos usually need research, writing, illustration, animation, voice and editing skills. Most AI tools either hide the process (a one-click black box) or price it unpredictably. |
| Unique value | (1) **You approve every step.** Script review with sources, then a storyboard. (2) **Price before you press generate**, with credits held and unused credits returned. (3) **Redo one scene** without paying for the whole video again. (4) A consistent illustrated style and character across scenes. |
| Ideal audience | **[Interpretation]** "Faceless" YouTube and Shorts creators; teachers and course makers; science and history communicators; small-business marketers who explain products. Common thread: people who care that the explanation is *right*, not just fast. |
| Market category | AI video generation, specifically the *explainer / educational* sub-category, beside Vyond, Lumen5, Pictory, Fliki, Steve AI and Higgsfield Explainer. |
| Expansion potential | Long-form (10 min), series with recurring characters, voice cloning, dubbing, course packs, a team or classroom edition, an API. The name should not lock the brand to "shorts" or "AI". |
| What users value most | **[Hypothesis]**, to be validated by interviews: (1) correctness and sources, (2) a look that isn't "AI slop", (3) predictable cost, (4) speed. |
| How the brand should feel | Calm, crafted, trustworthy and curious. In short: *a good teacher with good taste*. |

**Positioning [Interpretation]:** *the explainer studio that shows its work.* Every competitor sells speed and "AI magic". This brand sells **clarity you can check**, made with **craft you can see**.

---

## 3. Research into iconic brands: what actually builds recognition

| Principle | Evidence | What it means for us |
|---|---|---|
| **Distinctive assets need fame and uniqueness, measured, not guessed** | Jenni Romaniuk (Ehrenberg-Bass) defines distinctive brand assets as non-name elements that trigger the brand. They must be widely linked to it (fame) and to no one else (uniqueness). Prompted tests inflate fame by up to ~20 points, and marketers over-estimate fame and under-estimate uniqueness ([Contagious](https://contagious.com/io/article/jenni-romaniuk-on-distinctive-assets), [Marketing Week](https://www.marketingweek.com/marketers-judgement-strength-brand-assets-rarely-accurate/), [WARC](https://www.warc.com/newsandopinion/news/brands_need_distinctive_assets/40501)). | Pick **few** assets (a frame shape, a red seal, a card-slide motion) and repeat them everywhere for years. Test recognition with unprompted recall later. |
| **Contrast with the environment** | Romaniuk's core rule: choose assets for contrast against the visual environment they sit in ([Contagious](https://contagious.com/io/article/jenni-romaniuk-on-distinctive-assets)). | **[Verified]** Our category is dark mode plus neon, or purple gradients, plus Inter. A light, paper-and-ink identity with a seal red is maximum contrast. |
| **Character beats neutrality** | Duolingo's 2019 rebrand by Johnson Banks deliberately avoided "neutral, characterless, lowercase sans-serif" Silicon Valley typography. They drew a custom face (Feather Bold) *from the mascot's feathers* ([Creative Review](https://www.creativereview.co.uk/duolingo-rebrand-johnson-banks/), [Design Week](https://www.designweek.co.uk/duolingo-rebrand-avoids-silicon-valley-tropes-and-reflects-companys-quirky-personality/), [Monotype](https://www.monotype.com/resources/case-studies/duolingo)). | Derive type details and shapes from **one core metaphor** (the paper-theater frame) instead of choosing them separately. |
| **A symbol anyone can draw** | Airbnb's Bélo (DesignStudio, 2014) was built so "anyone could draw" it, and it carried several meanings at once: people, place, love, the "A" ([Design Week](https://www.designweek.co.uk/issues/july-2014/designstudio-creates-symbol-of-belonging-for-airbnb-rebrand/), [Dezeen](https://www.dezeen.com/2014/07/16/airbnb-rebrand-designstudio-logo-belo/amp/)). It was also criticised as looking familiar, which shows simple marks need clearance work. | The Kamibai frame mark is a rectangle inside a frame, so a child can draw it. Run a similarity search on the logo too, not just the name. |
| **A system, not a logo** | Spotify's 2015 identity by COLLINS widened green and black into a duotone imagery system with "bursting" shapes. They built a tool (the "Colorizer") so thousands of images stayed on-brand automatically ([Design Week](https://www.designweek.co.uk/spotify-undergoes-colourful-brand-refresh/), [Transform](https://www.transformmagazine.net/articles/2015/spotify-gets-visceral/)). | Our output *is* imagery. A **house style applied automatically to every generated video** (end card, seal, caption style, frame) does for us what the Colorizer did for Spotify: every video becomes an ad for the brand. |
| **Restraint as identity** | MUJI = *Mujirushi Ryōhin*, "no-brand quality goods". It started in 1980 as 40 private-label products in the Seiyu supermarket. Kenya Hara (adviser since 2001/2002) built its look on *emptiness*: not minimalism, but space that invites the viewer to take part ([Wikipedia](https://en.wikipedia.org/wiki/Muji), [MUJI](https://www.muji.com.vn/en/page/about), [Lars Müller, *Designing Design*](https://www.lars-mueller-publishers.com/designing-design)). | A name and voice that are **honest and plain**, with generous space. The *explanation* is the hero, not the chrome. |
| **Signature type** | Stripe is built on Söhne (Klim), set light at display sizes, with an indigo accent `#533afd` ([source](https://fontalternatives.com/inspiration/stripe-sohne/); third-party design-system write-ups). **[Verified]** Linear sets Inter Variable at weight 510 with negative tracking. | A recognisable type *treatment* can be owned even with an open-source face. Example: tight sentence-case display with seal-red punctuation. |
| **Easy names travel further** | Alter & Oppenheimer (PNAS 2006): easy-to-pronounce company names and tickers outperformed hard ones in early trading, controlling for size and industry ([Princeton](https://www.princeton.edu/news/2006/05/29/study-stock-performance-tied-ease-pronouncing-companys-name), [Nature](https://www.nature.com/news/2006/060529/full/news060529-2.html)). | Weight pronunciation heavily when scoring names. Kamibai reads as KAH-mee-bye in English. |
| **Colour carries personality** | Labrecque & Milne (2012, *J. Academy of Marketing Science*) link hue, saturation and value to brand personality dimensions ([abstract](https://colab.ws/articles/10.1007%2Fs11747-010-0245-y)). I could read the abstract only, so specific hue mappings are not claimed here. | Choose colour for **differentiation and fit**, not trend. A precise red reads as *excitement/energy* only when set against calm neutrals. |
| **Agencies building living systems** | Porto Rocha's Nike Running work rests on three anchors, logo, type and colour, as "a living visual system" ([D&AD](https://www.dandad.org/work/annual/behind-the-work/how-porto-rocha-refreshed-the-nike-brand)). Koto's Amazon overhaul (2025) unified a fragmented system of 50+ sub-brands. Pentagram, Wolff Olins and DesignStudio work along similar lines. | Keep **three anchors**: frame, seal-red, card-slide. Let everything else flex. |

**Why identities survive decades [Interpretation]:**
- The core is tied to a *true idea* about the company (Airbnb: belonging; MUJI: no-brand honesty).
- The assets are *simple enough to reproduce* in any medium.
- The company *repeats them consistently* long after the team is bored of them.

---

## 4. Competitor identity audit

There are 15 direct and indirect competitors. Full data is in [data/competitor-audit.md](data/competitor-audit.md). **[Verified]** Each was read from the live public homepage.

| Brand | Primary colour | Type | Personality | Positioning | Strength | Weakness |
|---|---|---|---|---|---|---|
| Higgsfield Explainer | Black + lime `#D1FE17` | Inter, uppercase | Hype, gamer-energy | Fast AI explainers | Bold, instantly "AI" | Shares the black-neon look with VEED and Revid; little warmth or trust |
| Lumen5 | Indigo `#5645F5` | Borna / Inter | Corporate-friendly | Repurpose content for business | Category veteran | Generic SaaS indigo; **name conflict with ours** |
| Pictory | Purple gradient | Pictory Sans / Inter | Marketing, promo-heavy | Text to video for marketers | Own typeface | Purple gradient sameness, banner noise |
| invideo | Dark + white, yellow promo | Lora serif H1 | "Serious creatives" | Agentic editor | Serif sets it apart | Promo clutter |
| Synthesia | Navy `#090B22` | Basier Square | Enterprise-safe | Avatars for business | Trust signals | Faces and avatars, not explainers |
| HeyGen | Cyan `#00C3FF` | ABC Solar / TT Norms | Friendly-personal | "AI videos starring you" | Clear promise | Avatar-centric |
| Runway | Near-black mono | ABC Normal | Lab / research | Real-world intelligence | Prestige, restraint | Pro tool, far from explainers |
| Pika | Photo-led, cream | Telka Extended caps | Fashion-editorial | Creative tools | Art direction | Not about understanding |
| LTX Studio | Near-black | Miriam Libre caps / Brown | Filmmaker | Storyboard-to-film | Storyboard UX | Cinematic, not educational |
| Fliki | Pink `#E91E63` | Nunito Sans 800 | Approachable | Voices and script to video | Warm | Generic layout |
| VEED | White + electric green `#96FF1A` | SwissNow | Social-native | AI video for social | Crisp type | Green and black overlaps Higgsfield and Revid |
| Captions | Light, pale | Exposure serif | Pro-editor calm | AI editing | Elegant serif | Editing, not explaining |
| Vyond | Burnt orange `#C84D16` | Sailec | Corporate L&D | "Knowledge into results" | Owns explainer-for-business | Dated corporate feel |
| Revid AI | Dark + mint `#A8FFC8` | Euclid | Creator growth | Short-form creators | Creator focus | Black-neon sameness |
| Steve AI | Cyan→magenta gradient | Inter 800 | Generic AI | "Tell better stories" | Explicit storytelling | Gradient pills: the most "template" look |

**Recurring patterns that make competitors look alike [Verified, from the audit]:**
1. **Inter everywhere.** It is the body font for Higgsfield, Lumen5, Pictory, invideo and Steve AI.
2. **Two colour clichés:** (a) near-black plus one neon (lime, electric green, mint) and (b) purple or indigo gradients.
3. **Pill buttons** with "Start / Try / Get started for free", often three versions on one page.
4. **H1s that say "AI video"** and lead with speed ("in minutes").
5. **No one owns a metaphor.** No competitor has a recurring visual idea beyond a logo.

**White space we can own [Interpretation]:**
- **Light, tactile, print-like** (paper and ink) in a dark, neon category.
- **A warm seal red**, distinct from Vyond's burnt orange `#C84D16` because it is redder, used sparingly like a stamp.
- **One owned metaphor:** the paper theater frame, through which every scene is presented.
- **"Shows its work"** messaging: sources, prices and approvals. Nobody leads with trust.

---

## 5. Brand naming and domain availability

### 5.1 Method
- **Generated:** 256 unique candidates across 7 rounds, then checked domains on the authoritative registry RDAP servers via the IANA bootstrap:
  - .com: Verisign
  - .app: Google Registry
  - .ai, .io, .video, .studio: Identity Digital
  - .co: .CO registry
- **Validated before use:** the checker correctly reported google.* as registered and a random string as unregistered.
- **Rate limits:** all requests were throttled.
- **What a result means:** "Not registered" = no registration record exists, so the name is very likely available. It may still be reserved or premium-priced. **Availability is only certain at checkout.**
- **For-sale status:** for registered .coms, checked from nameservers plus the live page (`parked.py`).
- **Prices:** Porkbun's public pricing data (standard tier, verified today):

| Extension | Price per year (register / renew, USD) |
|---|---|
| .com | $11.08 / $11.08 |
| .ai | $82.70 / $82.70 |
| .app | $8.75 / $14.93 |
| .io | $28.12 / $51.80 |
| .video | $8.24 / $31.41 |
| .studio | $11.84 / $41.71 |
| .co | $15.76 / $31.20 |

### 5.2 Candidate list (selected from the 256 checked)
Grouped by naming approach. `com✓` means the .com was unregistered on 2026-10-13.

- **MUJI-style Japanese shortenings (storytelling):**
  - Kamibai (com✓, all ✓)
  - Ehana (*e-banashi*, picture-story; com ✗)
  - Ebanashi (com✓)
  - Emaku (from *emaki*, illustrated scroll; com for sale)
  - Emono
  - Kagee (*kage-e*, shadow picture)
  - Nazeba (com✓)
  - Kamishiba, Ehoni, Monoga
- **"Explain = unfold"** (Latin *explicare*, "to unfold"):
  - Unplica (com✓)
  - Plicari (com✓)
  - Unplico (com✓)
  - Plicata, Explicata (com for sale, HugeDomains)
  - Plieto (com✓)
  - Tellfold, Whyfold
- **Early animation / cinema:**
  - Kinofold (com✓)
  - Zoefold (com✓)
  - Oriflick (origami + flick; com✓)
  - Zoetrix, Kinorama, Praxino, Thaumo
- **Curiosity / light:**
  - Whylit (com✓)
  - Owlfold (com✓)
  - Lampwise, Whylight, Ideolume, Glowfold
- **Real words (all .com taken):** Lumen, Oriel, Lanthorn, Glint, Ponder, Fathom, Brio, Wren, Weft and others. Typical for 2026.

### 5.3 Top 10 shortlist: domain verification

All results are **[Verified]** by RDAP on 2026-10-13. "Free" means no registration record.

| Name | .com | .ai | .app | .io | .video | Est. first-year cost (.com + .ai + .app) | Existing use found | Recommendation |
|---|---|---|---|---|---|---|---|---|
| **Kamibai** | Free | Free | Free | Free | Free | ≈ $102.53 | None found (web search) | **Register first** |
| **Oriflick** | Free | Free | Free | Free | Free | ≈ $102.53 | None found | Strong fallback |
| **Unplica** | Free | Free | Free | Free | Free | ≈ $102.53 | None found | Strong fallback |
| **Kinofold** | Free | Free | Free | Free | Free | ≈ $102.53 | None found | Good |
| **Zoefold** | Free | Free | Free | Free | Free | ≈ $102.53 | None found | Good, weaker sound |
| **Owlfold** | Free | Free | Free | Free | Free | ≈ $102.53 | None found | Owl territory crowded (Duolingo) |
| **Whylit** | Free | Free | Free | Free | Free | ≈ $102.53 | None found | Legal near-miss (WHYIT) |
| **Plicari** | Free | Free | Free | Free | Free | ≈ $102.53 | GitHub user exists | OK |
| **Ehana** | **Taken**: live site of eHana, a healthcare EHR software company (registered 1999) | Free | Free | Free | Free | .com not realistically buyable | eHana (software, US) | Avoid |
| **Emaku** | **For sale**, HugeDomains, **$7,195** buy-now or $299.79 a month for 24 months | Free | Free | Free | Free | ≈ $7,286 with .com | EMAKU SAILING (ES, cl. 25/36/39) | Only if budget allows |

**Social handles.**
- **GitHub [Verified]:** the usernames `kamibai`, `ehana`, `emaku` and `plicari` exist. The rest (unplica, oriflick, zoefold, owlfold, kinofold, whylit) are free.
- **YouTube:** checks were redirected to a consent page, so handle status could not be verified without signing in. This matters for an explainer brand, so check `@kamibai` while signed in before announcing.
- **Instagram, TikTok, X:** require a login and were not checked.

### 5.4 Scoring

**Scale:** each criterion is scored 1–5, then weighted.

| Criterion | Weight |
|---|---|
| Memorability (Mem) | 15 |
| Meaning / fit (Fit) | 15 |
| Pronunciation (Pron) | 10 |
| Spelling (Spell) | 5 |
| Distinctiveness in category (Dist) | 15 |
| Logo potential (Logo) | 10 |
| Domain (Dom) | 15 |
| Legal risk (Legal; higher = lower risk) | 15 |

**Scores** are **[Interpretation]**, except the domain and legal inputs, which are **[Verified]** facts.

| Name | Mem | Fit | Pron | Spell | Dist | Logo | Dom | Legal | **Score /100** |
|---|---|---|---|---|---|---|---|---|---|
| **Kamibai** | 5 | 5 | 4 | 4 | 5 | 5 | 5 | 4 | **94** |
| Oriflick | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 4 | **83** |
| Owlfold | 4 | 4 | 5 | 5 | 2 | 4 | 5 | 5 | **83** |
| Kinofold | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 4 | **83** |
| Unplica | 3 | 4 | 3 | 3 | 4 | 4 | 5 | 5 | **80** |
| Whylit | 4 | 4 | 3 | 4 | 4 | 4 | 5 | 3 | **77** |
| Zoefold | 3 | 3 | 3 | 3 | 4 | 3 | 5 | 5 | **75** |
| Plicari | 3 | 3 | 3 | 3 | 4 | 3 | 5 | 4 | **73** |
| Emaku | 3 | 4 | 3 | 4 | 4 | 4 | 3 | 4 | **72** |
| Ehana | 4 | 4 | 4 | 4 | 4 | 4 | 2 | 3 | **71** |

**Top five:** Kamibai, Oriflick, Kinofold, Owlfold, Unplica.
**Ranked top three:** **1. Kamibai, 2. Oriflick, 3. Unplica.**
- Unplica takes third over Kinofold and Owlfold despite a lower score: it has the cleanest legal picture and a brand story ("explain" literally means "unfold").
- Owlfold loses on distinctiveness because Duolingo and Hootsuite already own the owl.

**Why Kamibai is the strongest choice:**
1. **It names what the product does.** A narrator, illustrated scenes, one after another.
2. **It has a story people repeat.** "TV used to be called electric kamishibai; we're the AI kind." People pass on brands they can explain in one sentence.
3. **It is short and calm**, in the MUJI spirit, like the brand you referenced.
4. **It's available in every extension we checked**, with no exact trademark hit in the US or in TMview.
5. **It brings its own visual language.** The *butai* frame, paper cards and seal red make the logo, the motion and the UI frame from one idea.

### 5.5 Multilingual round: Spanish, Italian, Portuguese, French, Latin/Greek, Yoruba/Igbo/Swahili, Hindi, Korean

This round was added at the user's request: catchy names from languages other than Japanese.
- **Checked:** 91 more names (rounds 8–9), across .com, .ai, .app, .io, .video and .co, on 2026-10-13. Data: `data/domains_round8.json`, `data/domains_round9.json`.
- **Finding [Verified]:** as with Japanese and English, **every real word has its .com registered.** Only two coinages had a free .com:
  - Continho: Portuguese, "little tale". Hard for English speakers to pronounce.
  - Itanly: from Yoruba *ìtàn*, "story". Dropped, because it reads as "Italy"; USPTO's fuzzy search matched it to ITALY marks.
- **Practical route for a catchy real-language name:** buy the .com on the aftermarket, or launch on .ai/.app and buy the .com later.

**Strongest multilingual candidates:**

| Name | Language and meaning | .com [Verified] | .ai / .app / .io / .video / .co [Verified] | USPTO live marks in classes 9/41/42 [Verified] | Notes |
|---|---|---|---|---|---|
| **Teatrino** | Italian, "little theatre"; the traditional puppet/toy theatre | **For sale: $3,095** buy-now on Afternic ([listing](https://www.afternic.com/domain/teatrino.com)) | all free | **None** (2 live marks in total, other classes) | Same "paper theater" idea as Kamibai, in a European language. Catchy: tay-ah-TREE-no. |
| **Retablo** | Spanish, a box or altarpiece with painted scenes. Peruvian *retablos* are folk-art boxes that tell stories in scenes; *retablo de títeres* is a puppet show | Registered, no website (GoDaddy DNS). Sale status unknown | .ai, .app, .io and .video free | **None** (0 live marks) | Strong scene-box metaphor. **Risk:** religious meaning (altarpiece) in Spanish-speaking markets. |
| **Spiega** | Italian imperative, "explain!" | Registered, parked in a GoDaddy domain portfolio (namefind DNS). Price not public | .ai, .app, .io and .co free | **None** | The most literal meaning. Pronunciation varies (SPYEH-ga). |
| **Tizalo** | Coined from Spanish *tiza*, "chalk" (chalk it up) | **For sale: $2,595** on Afternic ([listing](https://www.afternic.com/domain/tizalo.com)) | all free | **None** | Catchy and easy to say (tee-ZAH-lo); the meaning needs telling. |
| **Viñeta / Vineta** | Spanish, "comic panel / vignette" | Used by a shipping company (MACS) since 1996 | .ai, .app, .io and .co free | VINCTA (class 42), low | The ñ breaks URLs and keyboards, so Vineta loses the meaning. |
| **Imagier** | French, "picture book / image-maker" | **For sale: $4,995** on Afternic ([listing](https://www.afternic.com/domain/imagier.com)) | .ai, .app, .io and .co free | Similar: IMAGIEN (classes 38, 41) | Elegant, but English speakers will say "imager". |
| **Alaye** | Yoruba, "explanation" | **For sale: $5,000** on Afternic ([listing](https://www.afternic.com/domain/alaye.com)) | .ai, .io and .co free | Similar: **ALAYA** (classes 41, 42, Benevity SA) | A beautiful meaning, but legal proximity is medium-high. |
| **Itan** | Yoruba, "story / history" | Registered | .video only | **ÌTÀN WA LAB** (class 41, education) | Conflict in education: avoid. |
| **Cordel** | Portuguese, Brazilian *literatura de cordel*: illustrated folk-story pamphlets hung on strings | Registered | .video only | **CORDEL** (classes 9, 42, Maestrano) | Conflict: avoid. |
| **Eccoli** | Italian, "here they are!" | On Afternic (price not fetched) | all free | None | Fun to say; weak meaning. |

**What these two rounds did not cover:** TMview (EU/international) blocked automated access during this round, so rounds 8–9 were screened against **USPTO only**. A trademark attorney should run the EU and WIPO checks before any purchase.

**Scores** (same framework as 5.4):

| Name | Mem | Fit | Pron | Spell | Dist | Logo | Dom | Legal | **Score** |
|---|---|---|---|---|---|---|---|---|---|
| **Teatrino** | 4 | 5 | 4 | 4 | 4 | 4 | 3 | 4 | **80** |
| Retablo | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 4 | **77** |
| Spiega | 4 | 5 | 3 | 3 | 4 | 3 | 3 | 4 | **75** |
| Tizalo | 4 | 3 | 4 | 4 | 4 | 4 | 3 | 4 | **74** |
| Vineta | 4 | 4 | 3 | 2 | 3 | 4 | 2 | 4 | **67** |
| Alaye | 4 | 5 | 3 | 3 | 4 | 3 | 3 | 2 | **71** |

### 5.6 Two-syllable round and "twisted spelling" round (added 2026-10-13)

**Two-syllable names (rounds 10–11, 115 names) [Verified].**
- **Every 4-letter consonant-vowel pattern** (Koma, Kado, Lumi, Kibo, Tello, Pavo…) has its .com registered. Most also have .ai, .app and .io registered.
- **Longer two-syllable coinages** have the .com taken as well.
- **Aftermarket prices found:** kamvo.com **$2,899** (Atom). folvo.com and ahaly.com are on GoDaddy/Afternic, with a price only after a contact form. lumo.com is held by a broker (MediaOptions).

| Name | .com [Verified RDAP, 2026-10-13] | Other TLDs free | USPTO live marks in classes 9/41/42 [Verified] | Verdict |
|---|---|---|---|---|
| **Whyfold** (why-fold: "every why, unfolded") | Registered 2026-05-05, no site, registrar-locked; expires 2027-05-05 | .ai .app .io .video .studio | **None** | **Best two-syllable name.** Launch on .ai/.app; try a broker for the .com |
| **Tellfold** (tell-fold) | Registered 2024-09-16, no site; expires 2027-09-16 | .ai .app .io | **None** (0 live) | Good |
| **Whylit** (why-lit) | **Unregistered** (all 7 TLDs free) | all | Near: WHYIT (classes 9, 41), WHYIT GNOYS | Good if counsel is comfortable |
| **Owlfold** | **Unregistered** (all free) | all | Near: OWLHOLD (class 9) | Clean, but owls are Duolingo's |
| **Tellwise** | Registered 2008, no site; **expires 2026-12-03** (watch for a drop) | .ai .app .co | Near: TELEWISE (class 9) | Reads like "telewise" |
| Pavo, Pilvo, Kamvo, Kembi, Tellby, Lumka, Folvo, Ilvo | taken / for sale | various | **Close live marks:** PAVO, PLIVO (cloud SaaS), KAMEO (Microsoft), KAMBI, TELLEY/TELLY, LUMIA, FOLIO | Avoid |

**Twisted spellings of real words, like "Vixual" (round 12, 36 names).** This is the Lyft / Flickr / Tumblr style.
- **Domains [Verified]:**
  - **vixual:** .ai, .app and .co free. vixual.com has been registered since 2002 (eNom), with no site.
  - **splainr, splayn, picturo:** .ai, .app, .io and .co free.
- **Legal:**
  - **[Verified]** USPTO has a live **VIZUAL** mark in class 9 (Singular Echo Inc.) and 2,934 records containing "visual".
  - **[Source]** USPTO practice (TMEP §1209.03(j)) treats a *novel or intentional misspelling* of a descriptive word as the descriptive word itself. The leading case: "QUIK-PRINT" was held merely descriptive for printing services ([USPTO Office action citing *In re Quik-Print*](https://tmng-al.uspto.gov/resting2/api/casedoc/ts/cd/97161923/OOA20220615125412/1/webcontent); [overview](https://www.patenttrademarkblog.com/?p=962)).
  - So **"Vixual" for video software would likely be refused as descriptive** of "visual", and the same applies to "Splainr" or "Xplain" for "explain".
- **Making the style work [Interpretation]:** twist a **suggestive** word, not a **descriptive** one. Lyft (lift) and Flickr (flicker) hint at a feeling; they don't name the product.
  - **For us:** names built on *why*, *fold*, *lit*, *owl* and *theatre* (Whyfold, Whylit, Teatrino, Kamibai) are suggestive, so they are registrable.
  - **Avoid:** misspellings of *visual*, *video*, *explain*, *story* or *picture*.

### 5.7 Animal and object round (added 2026-10-13)

**Why animals [Source / Interpretation].**
- **Some of the strongest distinctive assets are creatures:**
  - Duolingo's owl, from which its typeface was drawn ([Creative Review](https://www.creativereview.co.uk/duolingo-rebrand-johnson-banks/))
  - Firefox's fox
  - Mailchimp's chimp
  - Twitter's bird
- **What a creature gives you:** a mascot, a logo and a personality in one asset.
- **The criterion here:** pick animals whose *nature* means "explaining":
  - firefly = light in the dark / understanding
  - fox = clever
  - Odin's ravens Huginn ("thought") and Muninn ("memory")
  - magpie = collector
  - lyrebird = storyteller
  - paper crane = paper / folding

**Domains [Verified, round 13, 39 names].**
- **Every single animal word has its .com registered:** Kitsune, Magpie, Lyrebird, Narwhal, Quokka, Axolotl, Huginn, Hotaru (Japanese for firefly), Luciole (French for firefly)…
- **English "Firefly" is excluded:** it is Adobe's generative-AI brand.

| Name | Idea | .com [Verified] | Free TLDs | USPTO live marks in classes 9/41/42 [Verified] | Verdict |
|---|---|---|---|---|---|
| **Whyfox** | A curious fox who always asks "why?". Built-in mascot | Small personal site "whyfox" since 2010 | .ai .app .io .co | **None** | **Best animal name.** Friendly and Google-like; strong mascot |
| **Lucciola** | Italian "firefly": a small light in the dark | **For sale on Sedo**, make-an-offer only, 12 bids ([listing](https://sedo.com/search/details/?domain=lucciola.com)) | .ai .co | **None** | Beautiful sound (loo-CHOH-la); the firefly glow is a ready-made symbol |
| **Foxfold** | Fox + unfold | Registered 2023, no site | .ai .app .io .co | Near: FOXHOLD (classes 9, 42) | Good |
| **Kiteling** | A small kite: lightness, ideas taking off (an object, not an animal) | Registered Jul 2026, no site | .ai .app .io .co | **None** | Gentle and Apple-like |
| **Tsurufold** | *Tsuru* = paper crane + fold | **Unregistered** (all free) | all | **None** | Clean but clunky |
| Foxlit | — | For sale (Atom) | .ai .app .io .co | **FOXIT** (Foxit Software, classes 9, 42) | Avoid |
| Wrenlit, Cranefold | — | In use by other businesses (court reporting; design agency) | .ai .app .io .co | none | Avoid (existing users) |

**Recommendation for an animal direction [Interpretation]:**
- **Whyfox** is the best fit:
  - It makes the brand's voice a character: a curious, kind fox that asks why.
  - A fox silhouette is easy to draw in one colour, which suits the Apple-clean rules in §14A.
  - **Watch out:** keep the fox clearly different from Firefox's, for example a sitting fox drawn from simple geometric shapes, never curled around a circle.
- **Lucciola** is the most beautiful, if a .com negotiation is acceptable.

### 5.8 Other territories: mythology, "aha" sounds, light objects, craft objects, small nature (added 2026-10-13)

Round 14 checked 49 names [Verified, RDAP and USPTO, 2026-10-13].

| Name | Idea | Domains | USPTO live marks (any class) | Verdict |
|---|---|---|---|---|
| **Whyprism** | A prism splits white light into its colours; an explainer splits a big idea into clear parts | **All free incl. .com** | **0** | **Best of this round.** Symbol: a simple triangle with one red ray out (our single accent colour) |
| **Whyquill** | Why + quill: the question that starts the writing | **All free incl. .com** | **0** | Good; slightly old-fashioned |
| **Whyacorn** / **Acornfold** | Small seed, big oak: big ideas from small questions | **All free incl. .com** | **0** | Warm; acorn icon is simple |
| **Pebblefold** | Calm, smooth, friendly | **All free incl. .com** | **0** | Apple-calm sound. Note: "Pebble" is a smartwatch brand (different class) |
| **Nodfold** | The *nod* when you understand | **All free incl. .com** | **0** | Great meaning, weaker sound |
| **Cliofold** | Clio, the muse of history | **All free incl. .com** | **0** | Risk: the CLIO Awards are a famous advertising-awards brand |
| **Whybloom** / **Whypop** / **Whyspark** | Ideas blooming, popping, sparking | .ai .app .io .co free; .com taken | **0** live | Playful options for .ai/.app |
| Anansio | Anansi, the Akan spider who owns all stories | .ai .app .io .co free | **ANANSI** live in classes 9/41/42 (several owners) | Avoid |
| Pinwheely | Spinning motion | All free | **PINWHEEL** live in 9 and 41 | Avoid |
| Tadalight | "Ta-da" + light | .ai .app .io .co free | — | Avoid: sounds like *tadalafil* (a medicine) |
| Eurekly | Eureka | .ai .app .io .co free | — | Avoid: "reek" |

**Pattern [Interpretation]:**
- **The "Why-" family now forms a coherent naming system:** Whyfold, Whyprism, Whyfox, Whyquill, Whybloom.
- **Why it suits us:** it puts the viewer's question at the front of the brand, which fits "explain anything".
- **Why it's ownable:** the family is consistently clean on USPTO and largely free as domains.

### 5.9 "Video / motion / moving picture" in world languages (added 2026-10-13)

Round 15 checked 45 names [Verified, RDAP and USPTO, 2026-10-13].

**Legal caution first [Source].** Under the US **doctrine of foreign equivalents**, a word from a common modern language is translated. If the translation directly describes the product, it is treated as descriptive, just like the English word.
- **Recent example:** **VETEMENTS** (French for "clothing") was denied protection for clothing. The US Supreme Court declined to hear the appeal on 12 January 2026 ([Morgan Lewis, Mar 2026](https://www.morganlewis.com/de/pubs/2026/03/lost-in-translation-us-supreme-court-and-ttab-consider-doctrine-of-foreign-equivalents)).
- **The test:** whether an ordinary American buyer would "stop and translate" (*Palm Bay v. Veuve Clicquot*) ([overview](https://en.wikipedia.org/wiki/Doctrine_of_foreign_equivalents)).
- **What this means for us:** a word that just means "video" or "film" (Kino, Cine, Eiga, Video in any language) is weak. Words for **motion**, **activity** or **living pictures**, and coinages made from them, are safer.

**Results:**
- **Every plain word is taken as a .com:** Kino, Cine, Sinema, Moto, Motus, Gati, Kinesis, Kinema, Donghua, Chitra, Vivant.

| Name | Origin | Domains | USPTO live marks in classes 9/41/42 | Descriptiveness risk | Verdict |
|---|---|---|---|---|---|
| **Katsudo** | Japanese *katsudō shashin*, "moving photographs", the first Japanese word for cinema. Modern *katsudō* = "activity" | .ai .app .io .co free; .com taken | None | **Low** (modern meaning is "activity") | **Best of this round.** Pairs with the Kamibai story (Japanese picture-storytelling history) |
| **Ugokio** | From Japanese *ugoki*, "motion", + "-o" | **All free incl. .com** | **0 records** | Low to medium (a coinage) | Clean; 4 syllables (oo-GOH-kee-oh) |
| **Harakati** | Swahili, "movement / activity" | .ai .app .io .co free | None | Low | **Caution:** in Swahili and its Arabic root (*haraka*), the word is often used for political or militant "movements". Needs a cultural check |
| **Chitrel** | From Hindi *chitra*, "picture" | **All free incl. .com** | None | Low | Sounds like "Chitral" (a district in Pakistan) |
| **Chalchitra** | Hindi *chal-chitra*, literally "moving picture" | .app .io .co free | 0 records | **High**: a direct translation of "motion picture" | Lovely meaning, but descriptive and hard to spell |
| **Pohyb** | Czech, "motion" | .ai .app .io .co free | None | Medium | Hard to say in English |
| Gatika | From Hindi *gati*, "motion" | .ai .app .io .co free | **GATIK** (Gatik AI, classes 9, 42) | — | Avoid |
| Motusa | From Latin *motus*, "motion" | .ai .app .io .co free | **MOTUS** (class 42) | — | Avoid |
| Liikeo | From Finnish *liike*, "motion" | All free | **LINKEO** (classes 9, 41, 42) | — | Avoid |

**Sinema (checked separately at the user's request) [Verified, 2026-10-13]:**
- **Trademark:** **SINEMA** is a **live US registration owned by Siemens AG in class 9 (software)**. Siemens uses it for its SINEMA industrial remote-network software. This is a direct conflict for an app.
- **Domains:**
  - sinema.com: registered since 1996, "Coming Soon" page.
  - sinema.ai: listed **for sale on Spaceship**.
  - sinema.app: in use.
  - .io and .co: registered.
- **Meaning:** "cinema" in Turkish, Swahili, Malay and Indonesian. That makes it descriptive under the doctrine of foreign equivalents.
- **Association:** US politician Kyrsten Sinema.
- **Variants:** Sinemo and Sinemio (.ai .app .io .co free) are near-identical to Siemens' SINEMA, so they carry the same conflict.
- **Verdict:** **avoid.**

### 5.10 Bible-inspired names (added 2026-10-13)

**Why the Bible is a natural source.** Explaining and making understood are recurring themes:
- Jesus taught in **parables**; Hebrew *mashal* = parable or proverb.
- **Nehemiah 8:8:** the scribes "gave the sense, and caused them to understand the reading".
- **Habakkuk 2:2:** "Write the vision, and make it plain upon tables, that he may run that readeth it". This is almost a literal brief for an explainer video.

**Results.** Round 17 checked 34 names [Verified, RDAP and USPTO, 2026-10-13].
- **Every real word has its .com registered:** Parable, Mashal, Binah, Bina, Urim, Selah, Shema, Emmaus, Bezalel, Hineni, Talitha, Logos, Phos.
- **Most also have crowded US trademark records in our classes:**

| Name | Meaning | USPTO live marks in classes 9/41/42 [Verified] | Verdict |
|---|---|---|---|
| Parable / Parablo / Parabla | Parable | **12**, incl. **ASK PARABLE** (class 42) and **PARABLU** (class 42) | Avoid |
| Selah | Pause, reflect | **18**, incl. SELAH (classes 9, 41) | Avoid |
| Binah / Bina | Understanding | **8**, incl. **BINAH.AI** (class 9) and BINAH SYSTEMS | Avoid |
| Kinnor | David's lyre | **9**, incl. **KINNOR** (Kinnor Technologies) and **KINNOR BIBLE TO MUSIC** | Avoid |
| Urim / Urimo | "Lights" (Urim and Thummim) | Matches **Yale University's** marks, whose Hebrew motto is *Urim v'Thummim* | Avoid |
| Mashalo | Parable + "-o" | All domains free, but near **MAHALO** (classes 9, 42) | Weak |
| PlainVision | From Habakkuk 2:2 | **0**; .ai .app .io .co free | Clean but descriptive-sounding |

**Recommendation [Interpretation]:** use the Bible for the **tagline and story**, not the name.
- **"Write the vision. Make it plain."** (after Habakkuk 2:2) is a strong, public-domain line for an explainer brand. It can sit under any of the shortlisted names: Kamibai, Whyprism, Whyfold, Teatrino.
- **Why not a sacred word as the name:**
  - It ties the brand to a faith, which may narrow or alienate part of a general audience.
  - Commercial use of sacred terms can offend some believers.
  - **[Verified]** The useful words are already crowded with trademarks.
- **Option:** a faith-focused edition or channel (for churches and Bible teachers) could use biblical language more fully.

**Conclusion [Interpretation]:**
- **Teatrino** is the best non-Japanese name. It carries the *same* paper-theater idea as Kamibai, so the recommended identity (chapter 11, Concept 1) works with **either** name without redesign.
- **The trade-off:**
  - **Kamibai:** every domain free (≈ $103), a more distinctive sound, and cultural care needed.
  - **Teatrino:** instantly European and catchy, but a **$3,095** .com purchase.

---

## 6. Trademark and naming risk screening

**This is a preliminary screen, not clearance.** A clean result here does not mean a name is free to register or use. Only a trademark attorney's full search and opinion can say that, covering common-law use, phonetic and translated equivalents, and the target classes:
- **9:** downloadable software
- **41:** education and entertainment
- **42:** SaaS

**Databases searched [Verified, 2026-10-13]:**
- **USPTO Trademark Search:** through the official tmsearch.uspto.gov interface and its search endpoint. Query: exact phrase, plus word match, plus a fuzzy one-edit match.
- **EUIPO TMview:** "contains" search across all participating offices, which include EUIPO, many national offices and WIPO international registrations.
- **Search validation:** USPTO returned 19 records for "duolingo" and TMview a full page, confirming the searches actually ran.

| Name | USPTO (live marks near it) | TMview | Risk notes |
|---|---|---|---|
| **Kamibai** | No exact record. Similar: **KAMIKAI**, class 42 (Ikhor, Inc.) and KAMIBI, class 20 (furniture) | No rows | **Low to medium.** KAMIKAI is one letter apart and in software, so ask counsel about likelihood of confusion. Furniture is irrelevant. |
| Oriflick | No records | No rows | **Low.** "ORI-" sits near Oriflame (cosmetics) only in a different class. |
| Unplica | No records | No rows | **Low** |
| Kinofold | KINDFOLD, classes 16 and 41 (individual) | No rows | **Low to medium.** Class 41 overlaps education. |
| Zoefold | No records | No rows | **Low** |
| Owlfold | OWLHOLD, class 9 | No rows | **Low** (legal). Distinctiveness issue only. |
| Whylit | WHYIT GNOYS (classes 41, 9), WHYIT (class 9) | No rows | **Medium** |
| Plicari | 2 dead records | APLICARI (Brazil, class 35) | **Low** |
| Emaku | Similar: EMAQI (Orange Inc., JP; classes 9, 41, 42) | EMAKU SAILING (Spain, classes 25, 36, 39); WEMAKU (Benelux, 35, 41) | **Medium** |
| Ehana | Similar: EHANG (class 9), ETANA | EHANA (China, class 25), E Ehana (Vietnam, class 25) | **Medium to high** in practice: an established US software company (eHana) has used the name since 1999. |
| Lumen (current) | **LUMEN5, Reg. 6,245,561, class 42, video SaaS, live**; 1,421 "LUMEN" records in total | not needed | **High. Replace.** |

**Cultural and linguistic screen [Interpretation].** This needs native-speaker validation.
- **The name is Japanese-derived.** Kamibai is not a dictionary word. It is a shortening of 紙芝居 (*kami* 紙 "paper" + *shibai* 芝居 "play"). Two things to keep in mind:
  - **Homophone:** *kami* also sounds like 神 ("god"). Context makes the paper meaning clear, but brand copy should say "paper" explicitly.
  - **History:** kamishibai was also used for wartime propaganda in the 1930s and 1940s ([Japan Society](https://aboutjapan.japansociety.org/the-many-faces-of-kamishibai)). Tell the street-storyteller and educational story, and do not use wartime imagery.
- **Respect:** a non-Japanese company borrowing a Japanese cultural form should credit the form honestly, for example with an "About the name" page. It should avoid caricatured "Japanese-style" clichés (no faux-brush fonts, cherry blossoms or ninja). **[Hypothesis]** Japanese users will read the name as charming rather than appropriative. Test this with 5–10 Japanese speakers before launch.
- **English pronunciation:** KAH-mee-bye. The ending "bye" could be heard as goodbye. **[Hypothesis]** that this is harmless or even friendly; test it in a 5-second recall test.

---

## 7. Customer psychology and brand positioning

| Element | Recommendation |
|---|---|
| **Personality** | Calm, curious, precise, warm. A great teacher who also has taste. |
| **Archetype** | **The Sage** (truth, understanding) with a **Creator** accent (craft, imagination). It avoids the "Magician", "AI magic", where every competitor sits. |
| **Emotional positioning** | From *anxious about getting it wrong* (facts, cost, AI-slop look) to *confident and proud to publish*. |
| **Values** | Show your work. Plain prices. Craft over noise. Respect the viewer's attention. |
| **Voice** | Plain sentences, sentence case. No hype words ("unleash", "revolutionize"). Numbers stated exactly. Light warmth, never jokey about facts. |
| **Mission** | Make it easy for anyone to explain something true, beautifully. |
| **Vision** | The world's best explanations, made by anyone who understands something, not only by people with studios. |
| **Brand promise** | Every scene, sourced and priced before it's made. |
| **Main differentiating message** | "The explainer studio that shows its work." |

**What this audience likely trusts [Interpretation, from the competitor audit and the category complaints in docs/04]:**
- visible sources
- prices before commitment
- refunds that happen automatically
- outputs that don't look generated

**Aesthetic preference [Hypothesis]:** educational creators admire the craft-forward look of channels like Kurzgesagt (flat, vivid illustration). A *print / paper* aesthetic signals craft without copying them. Kurzgesagt is space-navy and vivid, so stay light and paper-toned.

**Taglines:**
1. **Paper theater for the AI age.** (Pairs with the name; explains it.)
2. **Every why, illustrated.**
3. **Explain anything. Show your work.**
4. **Questions in. Stories out.**
5. **The explainer studio that shows its work.**

**Positioning statement:** For creators and teachers who need explanations people can trust, Kamibai is the explainer-video studio that researches, scripts and illustrates a video scene by scene. It shows you the sources and the price before anything is made. Unlike one-click AI video generators, you approve every step and only pay for what you keep.

---

## 8. Logo research and concepts

**Principles from research:**
- Drawable by anyone (Airbnb's Bélo).
- Derived from the brand's core idea (Duolingo: type from the owl's feathers).
- Simple enough to survive 16 px.
- Contrast with the category ([Romaniuk](https://contagious.com/io/article/jenni-romaniuk-on-distinctive-assets)).
- Category check **[Verified]**: competitor marks are mostly lowercase wordmarks plus an abstract glyph (Lumen5's mark, Synthesia's mark, Pictory's purple glyph) or wordmark-only (Runway, VEED). None uses a frame or a seal.

| Concept | Core idea and symbolism | Why it fits | Memorability | Favicon / small sizes | Difference from competitors |
|---|---|---|---|---|---|
| **A. The Butai** (recommended, for Kamibai) | A simple stage frame, like a kamishibai box: a rounded rectangle with a slightly thicker top rail and an open "card slot" on one side. Inside, a single card edge is mid-slide. | The product literally presents cards in a frame. The mark doubles as the **video frame** used in UI and marketing. | High: it becomes the shape of every thumbnail and video. | Excellent: a frame plus one diagonal card reads at 16 px. Works as an app icon on the seal-red background. | No competitor uses a frame metaphor. |
| **B. The Seal (Hanko)** | A small square red seal with a minimal monogram "K" carved in negative space, used like an artist's stamp on every finished video end card. | "Made with care, signed." MUJI-like modesty, craft provenance. | High through repetition: it appears on every exported video. | Excellent: a solid red square. | A red square stamp is unique in AI video. Watch for generic "stamp" logos in other industries. |
| **C. Card Fan** | Three cards fanned like a deck: storyboard, scene, sequence. The middle card has a tiny play triangle cut out by negative space. | Storyboard to video. | Medium | Good, though the cutout is lost below 24 px. | Play-triangle marks are common; the fan saves it. |
| **D. Unfold Line** (for Unplica / Oriflick) | One continuous line that folds twice (Z-fold) and opens into a frame. Explain = *ex-plicare* = unfold. | Etymology as a symbol. | Medium-high, with a strong story. | Good as a 2-stroke glyph. | Abstract line marks exist (Linear's sphere is different). Distinctive with the fold. |
| **E. Custom wordmark** | Sentence-case wordmark. The dot of the "i" becomes a tiny seal-red square, the "card". | Low-cost, high consistency. | Medium alone; high when paired with the seal. | Use the red dot-square alone as the favicon. | Many wordmarks use colored dots. It needs the other assets to stand apart. |

**Recommended system:** **A (Butai)** as the primary symbol, **B (Seal)** as the signature stamp on outputs, and **E** as the wordmark. All three are built from one idea. This is a **responsive logo system**:

| Size or use | Version |
|---|---|
| Large | Full wordmark plus the frame |
| Medium | Frame alone |
| Smallest / favicon | Red seal square |

**Concepts only.** Final drawing needs a type designer or identity designer.

---

## 9. Color identity research

**Category conventions [Verified, audit]:**

| Colour family | Who uses it |
|---|---|
| Neon lime or electric green on black | Higgsfield `#D1FE17`, VEED `#96FF1A`, Revid `#A8FFC8` |
| Purple / indigo | Lumen5 `#5645F5`, Pictory, Steve AI gradients |
| Navy | Synthesia `#090B22` |
| Cyan | HeyGen `#00C3FF` |
| Pink | Fliki `#E91E63` |
| Burnt orange | Vyond `#C84D16` |
| Monochrome black | Runway, LTX |

**Unused:** paper neutrals with ink and a seal red; chalkboard green; amber "lamplight". **Accessibility [Verified]:** contrast ratios below were computed with the WCAG 2 formula.

**Cross-cultural notes [Source / Interpretation]:**
- Red reads as energy, celebration and luck in much of East Asia, and as urgency or energy in the West. Use it sparingly, as a stamp, not as page backgrounds.
- Green is widely read as growth or learning.
- Amber reads as warmth or light.
- Avoid relying on red/green pairs alone to signal state, because of colour-blindness.

### Direction A: "Paper Theater" (recommended, for Kamibai)
| Role | Name | HEX | Use |
|---|---|---|---|
| Signature | **Shu seal red** | `#C73A28` | Seal, primary button, key highlights (≤ 10% of any screen) |
| Ink (text) | Sumi | `#1C1D21` | Headlines, body |
| Paper (bg) | Washi | `#F6F3EC` | Light background |
| Secondary | Ai indigo | `#233A63` | Links, charts, secondary emphasis |
| Muted text | Stone | `#5E5D58` | Captions, metadata |
| Dark bg | Night sumi | `#141518` | Dark mode background |
| Dark accent | Shu light | `#F0644E` | Seal red tuned for dark mode |

**Contrast [Verified]:**

| Pair | Ratio | Rating |
|---|---|---|
| Sumi on washi | 15.20 | AAA |
| Shu red on washi | 4.66 | AA (text) |
| White on shu red | 5.17 | AA (button labels) |
| Indigo on washi | 10.21 | AAA |
| Stone on washi | 5.95 | AA |
| Washi on night sumi | 16.48 | AAA |
| Shu-light on night sumi | 5.77 | AA |

**Examples:** a sumi headline on washi with a red seal at its end; an indigo link; a red primary button with white text.

**Rationale:** maximum contrast with the black-neon and purple clusters; a direct link to the paper-theater metaphor. The washi is a cool-leaning off-white, deliberately not the beige/cream "premium" cliché, and it is paired with a cool sumi, not espresso brown.

### Direction B: "Chalkboard"
| Role | HEX |
|---|---|
| Board green (signature) | `#1F4A3A` |
| Chalk (bg / text on green) | `#F5F4EE` |
| Chalk yellow (accent) | `#F4C542` |
| Slate (text) | `#272C30` |

**Contrast [Verified]:**

| Pair | Ratio | Rating |
|---|---|---|
| Chalk on green | 9.08 | AAA |
| Yellow on green | 6.15 | AA |
| Slate on chalk | 12.80 | AAA |
| Sumi on yellow button | 10.24 | AAA |

**Rationale:** the chalkboard is the original explainer medium, and deep green is unclaimed in AI video. **Risk:** it can read as "school only", which narrows the audience to education.

### Direction C: "Lamplight Print"
| Role | HEX |
|---|---|
| Ink (signature dark) | `#16171C` |
| Paper | `#FAF8F3` |
| Lamplight amber (signature accent) | `#FFB23F` |
| Deep amber (text-safe) | `#9A5B00` |
| Night blue | `#1D2A4D` |

**Contrast [Verified]:**

| Pair | Ratio | Rating |
|---|---|---|
| Ink on paper | 16.86 | AAA |
| Amber on ink | 9.96 | AAA |
| Deep amber on paper | 5.11 | AA |
| Night blue on paper | 13.27 | AAA |

**Rationale:** "a light switching on", the moment of understanding. **Risk:** amber on dark drifts toward Higgsfield's energy, and InVideo uses yellow for promotions.

**Most recognisable and differentiated: Direction A.** It is the only one where the colour *is* the metaphor: the seal on paper. It is also the furthest from every competitor's palette.

---

## 10. Typography research

**Fonts evaluated (16):**
- **Open source (Google Fonts, SIL OFL):**
  - Geist and Geist Mono (Vercel). **[Source]** OFL 1.1 per the [vercel/geist-font](https://github.com/vercel/geist-font) repo; already used in the app.
  - Bricolage Grotesque. **[Source]** OFL; variable weight, width and optical size; ink traps at small sizes ([repo](https://github.com/ateliertriay/bricolage)).
  - Inter
  - Noto Sans JP
  - Zen Kaku Gothic New
  - Shippori Mincho
  - IBM Plex Mono
  - Montserrat
- **Fontshare (ITF Free Font License):** Satoshi, Cabinet Grotesk, General Sans, Clash Display. **[Source]** Free for commercial use, but restricts redistributing or self-hosting the raw files without permission. Read each package's FFL.txt before use ([licenseorg guide](https://licenseorg.com/guide/fonts/fontshare)).
- **Commercial:**
  - Söhne (Klim)
  - GT Walsheim (Grilli Type; web/app pricing not found publicly, ask the foundry)
  - Recoleta (Latinotype; family $129 on MyFonts [Source](https://myfonts.com/fonts/latinotype/recoleta/))
- **Deliberately avoided:**
  - **Inter** as the *display* face: **[Verified]** it is the default across 5 of 15 competitors.
  - **Fraunces** and **Instrument Serif:** flagged as overused "AI-default" display faces by the design-taste skill installed in this repo.

**How established companies use type as identity [Source]:**
- Duolingo commissioned Feather Bold from its mascot.
- Stripe uses Söhne, light at display sizes.
- **[Verified]** Linear uses Inter Variable at 510 with tight tracking.

**Lesson:** a consistent **treatment** (weight, case, tracking, one signature detail) is what people recognise, not just the font.

### System 1 (recommended, for Paper Theater / Kamibai)
- **Display:** [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque).
  - Weights 600 and 700; optical size set to "display".
  - Its ink-trap, printed character echoes paper and print, and it is rarely seen in the category.
- **Body / UI:** [Geist](https://vercel.com/font) 400, 500 and 600. It is already in the product.
- **Accent:** [Shippori Mincho](https://fonts.google.com/specimen/Shippori+Mincho), for one or two kanji only (紙, 芝居) on the "About the name" page and in seals. [Zen Kaku Gothic New](https://fonts.google.com/specimen/Zen+Kaku+Gothic+New) if a sans is wanted.
- **Data / prices:** Geist Mono, with tabular figures.
- **Hierarchy:**

| Style | Font and weight | Size / line-height | Tracking |
|---|---|---|---|
| Display | Bricolage 700 | 56/60 | −0.03em |
| H2 | Bricolage 600 | 32/38 | −0.02em |
| H3 | Geist 600 | 20/28 | — |
| Body | Geist 400 | 16/26 | — |
| Caption | Geist 500 | 13/18 | +0.01em |

- **Example headline:** "Paper theater for the AI age." Sumi ink, with the full stop set in **seal red**. The red full stop is the signature typographic detail.
- **Licensing:** all three typefaces are open-source (OFL), with no cost and full language coverage. Noto/Shippori cover Japanese.

### System 2 (for Chalkboard)
- **Display:** Cabinet Grotesk 800 (Fontshare). Confident and friendly.
- **Body:** General Sans 400 / 500 (Fontshare).
- **Accent:** IBM Plex Mono for numbers and "chalk notes".
- **Hierarchy:** display 52/56 at −0.02em; body 16/26.
- **Licence:** Fontshare FFL. Serve the fonts through Fontshare or check the self-hosting terms first.

### System 3 (premium commercial, for Lamplight Print)
- **Display and body:** Söhne (Klim): Breit for display, Buch for body.
- **Accent:** Söhne Mono.
- **Licence:** commercial, priced by Klim per web/app use. It is the most refined option, but **[Verified]** Stripe uses it, so it is less ownable.

---

## 11. Visual language and graphic identity

### Concept 1: "Paper Theater" (recommended)
- **Philosophy:** every idea is presented on a card, in a frame, by a narrator. It should be recognisable without the logo.
- **Shapes:** the *butai* frame (a rounded rectangle with a thicker top rail). Every video thumbnail, UI preview and social post sits inside it.
- **Signature motion:** the **card slide**. Scenes enter from the side like a card being pulled, with a 280 ms spring and no bounce, and the next card is revealed underneath. Used for page transitions and in the product's scene transitions as an optional house transition.
- **Seal:** a red square stamp on end cards, receipts, emails and "approved" states. Approving a script *stamps* it.
- **Imagery:** the product's own generated scenes, always framed, never full-bleed "AI art" walls. Texture comes from subtle paper grain, at ≤ 3% opacity and on fixed layers only (per the design-taste performance rules).
- **Illustration:** flat cut-paper shapes, matching the house "Paper Cut-out" style the product already generates.
- **Iconography:** Phosphor (already installed), regular weight; a custom set later.
- **Social consistency:** 9:16 posts are always a framed card on washi with a red seal in the bottom corner. One frame, one seal, one red.

### Concept 2: "Chalk Talk"
A chalkboard field with hand-drawn underline marks and arrows that "explain" UI elements. Motion is a chalk stroke drawing on. **Risk:** it reads as "for kids and schools".

### Concept 3: "Lamplight"
A lamp-glow radial light that switches on over the key idea, the "aha" moment. Ink and paper. Motion is a dim-to-bright reveal. **Risk:** glow effects drift toward the generic AI look.

**How the pieces work together (Concept 1):**
- frame = logo = video container
- red = seal = approve = primary action
- card slide = brand motion = product transition
- calm sumi type with a red full stop = voice

This is **three anchors** used everywhere, Porto Rocha-style.

---

## 12. Landing page inspiration and recommendations

These are research notes only, and nothing was built. **[Verified]** 19 homepages were opened and inspected. Stripe is cited from published sources only and was not inspected (data in [data/competitor-audit.md](data/competitor-audit.md)).

| Page | What works | Trade-off |
|---|---|---|
| [linear.app](https://linear.app/) | Product UI as hero; restrained type (Inter 510, tight tracking) | Interchangeable with many dark SaaS sites |
| [duolingo.com](https://www.duolingo.com/) | Mascot plus custom type = instant recognition; one CTA | Playful tone wouldn't fit a "Sage" brand |
| [notion.com](https://www.notion.com/) | Hand-drawn faces as an owned asset | Busy below the fold |
| [kurzgesagt.org](https://kurzgesagt.org/) | Illustration *is* the brand; strong mission line | Heavy, slow scenes |
| [revid.ai](https://www.revid.ai/) | Creator-growth promise ("Where short-form creators grow") | Dark plus mint, pill sameness |
| [higgsfield.ai/explainer](https://higgsfield.ai/explainer) | Demo-first ("You describe. Higgsfield explains") | Black-neon sameness |
| [lumen5.com](https://lumen5.com/) | Clear B2B promise | Generic indigo and pills |
| [pictory.ai](https://pictory.ai/) | Own font | Promo banner and cookie clutter |
| [invideo.io](https://invideo.io/) | Serif H1 stands out | Promo noise |
| [synthesia.io](https://www.synthesia.io/) | Trust bar ("Fortune 100") | Corporate sameness |
| [heygen.com](https://www.heygen.com/) | Human promise, real faces | Avatar focus |
| [runway.com](https://runway.com/) | Prestige restraint | Abstract message |
| [pika.art](https://pika.art/) | Editorial photography | Little product explanation |
| [ltx.io/studio](https://ltx.io/studio) | Storyboard-led story | Dark, cinematic, uppercase |
| [fliki.ai](https://fliki.ai/) | Prompt box in hero (try instantly) | Generic layout |
| [veed.io](https://www.veed.io/) | Crisp type; prompt in hero | Neon green |
| [captions.ai](https://www.captions.ai/) | Calm serif; upload-first | Not about explaining |
| [vyond.com](https://www.vyond.com/) | Owns "knowledge" positioning | Corporate L&D tone |
| [steve.ai](https://www.steve.ai/) | Explicit storytelling message | Gradient-pill template look |

### Direction 1: "The Stage" (recommended, Paper Theater)
- **Aesthetic:** washi paper, sumi ink, one red seal, lots of space (MUJI *ma*).
- **Hero:**
  - **Left:** headline "Paper theater for the AI age." (red full stop), one line of subtext, one CTA "Make a video".
  - **Right:** the *butai* frame playing a real Kamibai video. Its cards slide in sync with narration and captions.
- **Main visual:** the frame is the hero, the logo and the player at once.
- **Background:** washi with fixed grain at ≤ 3%; no gradients.
- **Motion:** card slide between sections; the seal "stamps" when the visitor reaches the pricing section.
- **Navigation:** a slim translucent bar with Examples, How it works, Pricing, Sign in, and one red button.
- **CTA strategy:** one action label everywhere ("Make a video"). The secondary action is "Watch an example".
- **Content hierarchy:**
  1. Hero (frame plus a real video)
  2. "Shows its work" in three framed cards: Script with sources, Storyboard with price, Redo one scene
  3. A real example gallery (framed thumbnails)
  4. "The price before you press generate", a live receipt with the seal
  5. About the name: kamishibai history, two kanji, one archival-style illustration (licensed or commissioned)
  6. Formats (Short / Full)
  7. FAQ
  8. Final CTA

### Direction 2: "Try it in the hero"
A prompt box as the hero ("What should we explain?"). Typing shows a live storyboard preview made of free placeholder cards. This proves the approval flow instantly. **Trade-off:** it is the same pattern as Fliki and VEED, so it is less distinctive. Branding has to carry it.

### Direction 3: "Editorial"
Long-form scroll like a magazine essay. Each section is one explained idea, made with the product. **Trade-off:** slower to convert; best for content marketing pages rather than the home page.

**Recommended section structure:** Direction 1's eight sections above. Keep one CTA label; put the real product (a video, a real storyboard) above the fold; show the price receipt before the FAQ.

---

## 13. Three complete brand concepts

| | **1. Kamibai: "Paper Theater"** | **2. Oriflick: "Fold & Flick"** | **3. Unplica: "Unfold"** |
|---|---|---|---|
| Name meaning | Short for kamishibai, "paper play": a narrator plus illustrated cards | Origami (fold) + flick (flipbook motion) | From Latin *explicare*, "unfold" = explain |
| Domains [Verified] | .com, .ai, .app, .io, .video, .studio, .co all unregistered | .com, .ai, .app, .io, .video, .studio unregistered | Same |
| Positioning | The explainer studio that shows its work | Turn any idea into a little moving story | Every idea, unfolded |
| Personality | Calm sage, crafted, honest | Playful, clever, bright | Clear, intellectual, modern |
| Tagline | "Paper theater for the AI age." | "Fold an idea. Flick it to life." | "Explain anything. Unfolded." |
| Logo | Butai frame + red seal + wordmark | A flipbook corner that folds into an "O" | A Z-fold line opening into a frame |
| Palette | Direction A: shu red `#C73A28`, sumi, washi, ai indigo | Direction C-variant: ink + lamplight amber `#FFB23F` + paper | Direction B-variant: deep green `#1F4A3A` + chalk + yellow |
| Fonts | Bricolage Grotesque / Geist / Shippori Mincho | Cabinet Grotesk / General Sans | Geist / Geist Mono (+ Söhne later) |
| Signature elements | Frame, seal, card slide | Page-curl corner, flick motion | Fold line, unfold reveal |
| Visual references | Kamishibai butai, MUJI, Japanese print | Flipbooks, paper toys | Swiss print, diagrams |
| Landing direction | "The Stage" | "Try it in the hero" | "Editorial" |
| Emotional appeal | Trust and charm | Delight | Clarity |
| Differentiation | Highest: no one owns paper theater, and the palette is unique | Medium-high | Medium |
| Advantages | Story people retell; one idea drives everything; every domain free | Easy to say and spell; fun | Cleanest legal screen; smart story |
| Risks | Cultural care needed; KAMIKAI similarity (class 42); "bye" ending | Ori- prefix near Oriflame (other class); playful may undercut trust | Pronunciation varies; abstract; needs explanation |

---

## 14. Brand evaluation and scoring

**Weights:**

| Criterion | Weight |
|---|---|
| Recognisability | 20 |
| Differentiation | 20 |
| Audience fit | 15 |
| Story / meaning | 10 |
| Domain | 10 |
| Legal (preliminary) | 15 |
| Scalability | 10 |

**Scores (1–5):**

| Concept | Recog. | Diff. | Fit | Story | Domain | Legal | Scale | **Total /100** |
|---|---|---|---|---|---|---|---|---|
| Kamibai: Paper Theater | 5 | 5 | 4 | 5 | 5 | 4 | 4 | **91** |
| Oriflick: Fold & Flick | 4 | 4 | 4 | 4 | 5 | 4 | 4 | **81** |
| Unplica: Unfold | 3 | 3 | 4 | 4 | 5 | 5 | 5 | **77** |

Scores are **[Interpretation]**, except the domain and legal inputs, which are **[Verified]** screens.

---

## 14A. Apple / Google-grade refinement (added 2026-10-13 at the user's request: "clean and aesthetic, especially like Apple")

### What actually makes Apple and Google look clean

Measured on the live sites (apple.com and about.google) on 2026-10-13 **[Verified]**, plus published history **[Source]**.

| Ingredient | Apple **[Verified]** | Google **[Verified]** | The principle underneath |
|---|---|---|---|
| **Brand colour in the UI** | Almost none. Text `#1D1D1F`, surfaces `#FFFFFF` / `#F5F5F7`, secondary grey `#86868B`. **One** action colour: blue `#0071E3` | Same restraint. Text `#202124`, grey `#5F6368`, **one** action blue `#1A73E8`. The four logo colours stay in the logo | **The product supplies the colour; the chrome stays neutral.** One accent, used only for "do this". |
| **Typography** | SF Pro Display for headlines, SF Pro Text for body at 17 px. Headlines in regular or semibold, never heavy | Google Sans at weight **400** (regular), −0.5 px tracking at 40–48 px | A custom-feeling neutral sans, large and **light**, slightly tight at big sizes. Hierarchy comes from size and space, not boldness. |
| **Buttons** | Full pill (radius 980 px), padding 11×21 px, 17 px label | Full pill (radius 48 px) | One shape, one colour, short verbs ("Learn more", "Buy"). |
| **Navigation** | 48 px tall, translucent, background blur (`saturate(1.8) blur(20px)`) | Thin, white | Chrome nearly disappears. |
| **Layout** | One product and one line per screen-tall section; huge space; product photo as the hero | Large single statements, generous space | **One idea per screen.** |
| **Copy** | Two- or three-word lines ("Pro further.") | Plain, helpful | Confidence = fewer words. |
| **Logo** | **[Source]** Rob Janoff's 1977 apple. The "bite" exists so it doesn't read as a cherry tomato ([Creative Bloq](https://www.creativebloq.com/news/apple-logo-history)). Rainbow until 1998, monochrome from about 1998–2000 | **[Source]** The 2015 redesign moved from a serif wordmark to Product Sans, a geometric sans, and added a four-colour "G" icon ([DesignCurial](https://www.designcurial.com/news/new-google-logo-2015-4661827)) | **One simple silhouette with one deliberate quirk** (the bite, the slanted "e"). It works in one colour at 16 px. |
| **Type ownership** | **[Source]** San Francisco, Apple's own typeface, launched in 2015 with Apple Watch ([Wikipedia](https://en.wikipedia.org/wiki/San_Francisco_(sans-serif_typeface))) | **[Source]** Google Sans (proprietary); **Google Sans Flex released as open source (OFL) on Google Fonts in Nov 2025** ([9to5Google](https://9to5google.com/2025/11/18/google-sans-flex-font-available/)) | Big brands own their type. We can't afford a custom face yet, so pick one face and own a *treatment*. |
| **Simplicity as culture** | **[Source]** Ken Segall (Apple's agency creative director, named the iMac): Jobs judged everything "through the lens of simplicity", protecting the simple idea "from beginning to the end" ([Macworld](https://www.macworld.com/article/228134/former-apple-ad-man-ken-segall-on-steve-jobs-simplicity-and-why-an-apple-car-wouldnt-be-so-crazy.html), [*Think Simple*](https://www.penguinrandomhouse.com/books/317179/think-simple-by-ken-segall/)) | — | Remove until it breaks, then add one thing back. |

**Two cautions from the evidence:**
- **SF Pro cannot be used on our website.** **[Source]** Apple's font licence limits SF Pro to designing apps for Apple platforms and excludes "website content" ([Apple Fonts](https://developer.apple.com/fonts/); licence excerpts in [Apple developer forums](https://developer.apple.com/forums/thread/727961)). Copying Apple's font isn't an option, legally or for differentiation.
- **Apple's own grey fails accessibility for small text.** **[Verified]** `#86868B` on white = **3.62:1**, below WCAG AA 4.5:1. Our version keeps the look and passes.

### The refined direction: "Paper Theater, Apple-clean"
Keep the **one idea** (a frame that presents scenes) and the **one accent** (seal red). Remove the craft decoration: no paper grain, no kanji on the main surfaces, and no secondary indigo. The colour comes from the user's videos, just as Apple's comes from its product photos.

**Colour.** Every pair below meets WCAG AA or better **[Verified]**.

| Role | Light | Dark | Contrast |
|---|---|---|---|
| Background | White `#FFFFFF` | Black `#0A0A0B` | — |
| Section surface | Mist `#F4F4F2` (a hint of paper) | `#161618` | — |
| Text | Ink `#18181B` | `#F5F5F4` | 17.72 on white, 16.09 on mist, 18.14 on dark (AAA) |
| Secondary text | `#6B6B70` | `#A1A1A6` | 5.30 on white, 4.81 on mist (AA); 7.69 on dark (AAA) |
| **The one accent** (actions, seal, active state) | **Seal red `#C73A28`** | `#FF5A45` | White label on it 5.17 (AA); red on white 5.17; dark 6.41 (AA) |
| Brand colour budget | Accent at most ~5% of any screen; everything else neutral or the user's video | | |

**Why red and not blue [Interpretation]:** blue is Apple's, Google's, Notion's (`#0075DE`) and much of the category's. A precise seal red on white is just as clean and is ownable. MUJI's dark-red wordmark on white proves red can be calm.

**Type.**
- **Recommended:** **Geist** (OFL, already in the app) for everything. Its Swiss neutrality is the closest free equivalent to SF Pro.
  - **Display:** 48–64 px, weight 500–600, tracking −0.03em.
  - **Body:** 17 px, weight 400, line-height 1.5.
  - **Captions:** 13 px, weight 500.
- **Alternative:** **Google Sans Flex** (OFL). Very Google-like, which works against differentiation. Use it only if you prefer its friendlier, rounder letters.
- **Retire Bricolage Grotesque** in this direction: its quirky ink traps are craft, not Apple-clean.

**Logo: one silhouette, one quirk.**
- **The frame:** a single rounded rectangle, the video and stage frame.
- **The quirk:** a small square "card" notched out of the top-right corner. It is our "bite": it makes the frame ownable and signals "a card being presented".
- **Colour and sizes:** monochrome by default (ink, or white on video). The red version is used only as the app icon.
- **Favicon:** the notched square alone.
- **Wordmark:** "kamibai" in lowercase Geist 600, tracking −0.02em. No seal dot or other decoration, so the symbol does the work, as with Apple.

**Layout rules (Apple-style).**
1. **One idea per screen-tall section:** a headline (≤ 6 words), one sentence, one action.
2. **The product is the hero:** a real generated video, full width, framed in the notched frame.
3. **Huge space:** section padding 120–160 px desktop and 80 px mobile; max text width 640 px.
4. **One button style:** a red pill. Secondary actions are plain text links with "›", as on apple.com.
5. **Chrome:** a 48 px translucent bar with a blur. Footer in small grey type.
6. **Copy:** short and declarative.
   - Headlines: "Explain anything." / "Every scene. Priced first." / "Redo one. Keep the rest."
   - Tagline: "**Explain anything.**" (shorter than "Paper theater for the AI age"; save that line for the About page).

**Motion.**
- Apple-like springs: about 300 ms, no bounce.
- The **card slide** stays as the single signature transition.
- The red "seal" press on approval becomes a subtle 150 ms scale and fill: the only delightful moment, like Apple's checkmarks.

**Landing page (Apple-style version of Direction 1, "The Stage"):**

| # | Section |
|---|---|
| 1 | "Explain anything." + a full-width framed video autoplaying (muted) + "Make a video" (red pill) + "Watch the film ›" |
| 2 | "Every fact, sourced." Script with source chips |
| 3 | "Every scene, priced first." Storyboard plus a receipt |
| 4 | "Redo one. Keep the rest." Scene swap |
| 5 | A gallery of real videos (framed) |
| 6 | Pricing in one line, then FAQ, then the footer |

Each section is one screen tall, one message, mostly white or black.

**Does the name fit an Apple/Google-style brand? [Interpretation]**
- Apple and Google are **short, friendly, non-descriptive real words**.
- Kamibai (3 syllables, soft sounds) fits well. Teatrino (4 syllables) fits less well. Oriflick is playful, more Google than Apple.
- **[Hypothesis]** A 2-syllable name would be even closer to the Apple ideal. A short, targeted naming round can be run if wanted.

**What we keep vs. drop from the earlier "Paper Theater" concept:**

| Keep | Drop |
|---|---|
| The frame | Paper grain texture |
| Seal red as the single accent | Washi beige as the main background (now white or mist) |
| The card slide | Indigo secondary colour |
| The calm voice | Kanji and Japanese typography on main pages (keep for the About page) |
| | Bricolage display font |

---

## 15. Final recommended brand identity

**Kamibai: explain anything.** This is the "Paper Theater, Apple-clean" direction from §14A.

| Element | Choice |
|---|---|
| Name | **Kamibai** (alternative: Teatrino; see §5.5) |
| Tagline | "**Explain anything.**" Secondary, for the About page: "Paper theater for the AI age." |
| Symbol | The **notched frame**: a rounded rectangle with a card notch, monochrome |
| Signature accent | **Seal red `#C73A28`** (dark mode `#FF5A45`), the *only* brand colour, ≤ 5% of a screen |
| Neutrals | White `#FFFFFF`, mist `#F4F4F2`, ink `#18181B`, secondary `#6B6B70`; dark mode `#0A0A0B` / `#161618` / `#F5F5F4` / `#A1A1A6` |
| Wordmark | "kamibai", lowercase Geist 600, −0.02em |
| Type | **Geist** throughout (OFL). Optional alternative: Google Sans Flex (OFL) |
| Motion | Card slide (signature), 300 ms no-bounce springs, seal-press on approval |
| Voice | Short, calm, exact; shows sources and prices |
| Recognition anchors | Notched frame, seal red, card slide. Use them everywhere and change nothing for at least two years. |

**Why it wins:**
- It is the only concept whose name, symbol, colour, motion and story all come from **one true idea about the product**.
- It sits in **visual territory that no competitor occupies [Verified, audit]**.
- Every domain checked is unregistered **[Verified]**.

---

## 16. Design and implementation brief (for a later phase)

Do this **after** you approve the brand and a lawyer clears the name.

1. **Secure the name first:**
   - register kamibai.com, .ai and .app (≈ $103 first year at standard Porkbun prices)
   - check `@kamibai` on YouTube, Instagram, TikTok and X while signed in
   - commission a trademark clearance search in classes 9, 41 and 42
   - run the native-speaker review
2. **Identity design:**
   - draw the notched-frame symbol and the "kamibai" wordmark (identity designer)
   - build the responsive logo set: wordmark plus symbol, symbol alone, notched-square favicon
   - add the app icon on seal red
3. **Design tokens:** replace the current teal accent with the §14A tokens: seal red as the single accent, plus the white/mist/ink neutrals for light and dark, in `apps/web/app/globals.css`.
4. **Typography:** keep **Geist** as the only typeface and apply the §14A sizes and tracking. Load Shippori Mincho only on the About-the-name page.
5. **Product touches:**
   - approve = seal stamp micro-interaction
   - framed scene thumbnails
   - optional "Kamibai end card" with the seal on exported videos (user can turn it off)
6. **Landing:** build the Apple-style landing page in §14A (six one-screen sections); one CTA label.
7. **Validate:**
   - a 5-second test of name recall and pronunciation (n ≥ 20)
   - a preference test of Paper Theater vs. the current look with 8–10 target creators
   - a Japanese-speaker reception check (n ≥ 5)
8. **Governance:** a one-page brand sheet (do / don't) and a quarterly asset-consistency check.

---

## 17. Research sources and verification dates

All web sources were accessed on **2026-10-13**.

**Added for §14A:**
- **[Verified] live style reads:** [apple.com](https://www.apple.com/) and [about.google](https://about.google/).
- **Apple logo history:** [Creative Bloq](https://www.creativebloq.com/news/apple-logo-history).
- **Typefaces:** [San Francisco](https://en.wikipedia.org/wiki/San_Francisco_(sans-serif_typeface)); [Apple Fonts licence page](https://developer.apple.com/fonts/); [Google Sans Flex OFL release](https://9to5google.com/2025/11/18/google-sans-flex-font-available/).
- **Google's 2015 logo:** [DesignCurial](https://www.designcurial.com/news/new-google-logo-2015-4661827).
- **Ken Segall on simplicity:** [Macworld](https://www.macworld.com/article/228134/former-apple-ad-man-ken-segall-on-steve-jobs-simplicity-and-why-an-apple-car-wouldnt-be-so-crazy.html); [*Think Simple*](https://www.penguinrandomhouse.com/books/317179/think-simple-by-ken-segall/).

### Primary checks run on 2026-10-13
- **Domains:** RDAP. Endpoints used:
  - Verisign (.com): https://rdap.verisign.com/com/v1/domain/
  - Google Registry (.app): https://pubapi.registry.google/rdap/domain/
  - Identity Digital (.ai, .io, .video, .studio): https://rdap.identitydigital.services/rdap/domain/
  - .CO registry (.co): https://rdap.registry.co/co/domain/
  - Results: [data/](data/)
- **Prices:** Porkbun public pricing API (https://api.porkbun.com/api/json/v3/pricing/get).
- **Aftermarket listings:**
  - [HugeDomains: emaku.com, $7,195](https://www.hugedomains.com/domain_profile.cfm?d=emaku.com); also explicata.com and kirigo.com
  - [Spaceship: tellbird.com](https://tellbird.com)
- **Trademarks:**
  - [USPTO Trademark Search](https://tmsearch.uspto.gov/), including LUMEN5 Reg. No. 6,245,561 (serial 90075778)
  - [EUIPO TMview](https://www.tmdn.org/tmview/)
- **Competitor and reference sites:** the 19 URLs in chapter 12; computed styles read in the browser.

### Published sources
- **Distinctive assets:**
  - Romaniuk: [Contagious](https://contagious.com/io/article/jenni-romaniuk-on-distinctive-assets)
  - [Marketing Week](https://www.marketingweek.com/marketers-judgement-strength-brand-assets-rarely-accurate/)
  - [WARC](https://www.warc.com/newsandopinion/news/brands_need_distinctive_assets/40501)
- **Duolingo:**
  - [Creative Review](https://www.creativereview.co.uk/duolingo-rebrand-johnson-banks/)
  - [Design Week](https://www.designweek.co.uk/duolingo-rebrand-avoids-silicon-valley-tropes-and-reflects-companys-quirky-personality/)
  - [Monotype](https://www.monotype.com/resources/case-studies/duolingo)
- **Airbnb:**
  - [Design Week](https://www.designweek.co.uk/issues/july-2014/designstudio-creates-symbol-of-belonging-for-airbnb-rebrand/)
  - [Dezeen](https://www.dezeen.com/2014/07/16/airbnb-rebrand-designstudio-logo-belo/amp/)
- **Spotify:**
  - [Design Week](https://www.designweek.co.uk/spotify-undergoes-colourful-brand-refresh/)
  - [Transform](https://www.transformmagazine.net/articles/2015/spotify-gets-visceral/)
- **MUJI:**
  - [Wikipedia](https://en.wikipedia.org/wiki/Muji)
  - [MUJI](https://www.muji.com.vn/en/page/about)
  - [Kenya Hara, *Designing Design*](https://www.lars-mueller-publishers.com/designing-design)
- **Kamishibai:**
  - [Japan Society](https://aboutjapan.japansociety.org/the-many-faces-of-kamishibai)
  - [Wikipedia](https://www.wikipedia.org/wiki/Kamishibai)
  - [Ohio State lesson plan](https://easc.osu.edu/sites/easc.osu.edu/files/kamishibai-papertheater-ela-lessonplan.pdf)
- **Name fluency:**
  - [Princeton](https://www.princeton.edu/news/2006/05/29/study-stock-performance-tied-ease-pronouncing-companys-name)
  - [Nature](https://www.nature.com/news/2006/060529/full/news060529-2.html)
- **Colour:** [Labrecque & Milne 2012](https://colab.ws/articles/10.1007%2Fs11747-010-0245-y) (abstract only)
- **Agencies:**
  - [D&AD: Porto Rocha × Nike](https://www.dandad.org/work/annual/behind-the-work/how-porto-rocha-refreshed-the-nike-brand)
  - [Creative Review: Porto Rocha × Tinder](https://www.creativereview.co.uk/porto-rocha-reveals-first-tinder-rebrand-in-a-decade/)
- **Stripe/Söhne:** [fontalternatives](https://fontalternatives.com/inspiration/stripe-sohne/) (third-party)
- **Fonts and licences:**
  - [vercel/geist-font](https://github.com/vercel/geist-font)
  - [Bricolage repo](https://github.com/ateliertriay/bricolage)
  - [Fontshare licence guide](https://licenseorg.com/guide/fonts/fontshare)
  - [Recoleta on MyFonts](https://myfonts.com/fonts/latinotype/recoleta/)

### Limitations
- **Trademarks:** this was a preliminary knockout screen. It does not cover common-law use, phonetic/translated equivalents in depth, or design marks.
- **Domains:** "not registered" can still mean reserved or premium; it is confirmed only at checkout. Availability can change at any time; these results were valid on 2026-10-13.
- **Social handles:** YouTube, Instagram, TikTok and X were not verifiable without signing in.
- **Competitor styles:** these are a snapshot; sites change and A/B test.
- **Reading depth:** for Labrecque & Milne, only the abstract was read. Some brand case details come from press coverage, not official guidelines (marked [Source]).
- **No user research yet:** audience preferences in chapter 7 are hypotheses until tested.
