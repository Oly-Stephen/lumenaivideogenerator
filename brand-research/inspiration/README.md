# Inspiration board: Whyfold "Apple-clean" identity

**What this is:** desktop screenshots of public homepages, taken on 2026-10-13 with headless Microsoft Edge.
- **Sizes:** 1440×900 (`name.png`) and 1440×2400 (`name-long.png`).
- **Use:** private design reference only. **Do not copy layouts, copy or assets.** We borrow principles.
- **Banners:** some captures show cookie or region banners. They were not dismissed, because no consent was given.

## What we take from each

| File | Site | What we borrow | What we avoid |
|---|---|---|---|
| `02-apple-home.png` | apple.com | One product line and one short line ("Pro further."). **Filled pill plus outline pill** pairing. Product as the hero on a flat field | Dark hero is product-specific |
| `03-apple-iphone*.png`, `01-apple-iphone-top.jpg` | apple.com/iphone | Huge **page title** in ink. A **light-grey rounded panel** (≈28 px radius, `#F5F5F7`) holding title, subline, **blue pill + "View pricing ›" text link** | Product carousel (we don't sell hardware) |
| `04-apple-intelligence*.png` | apple.com/apple-intelligence | **Small label above a two-line headline** ("Siri AI" / "Your AI assistant. More personal. More powerful.") with a **grey paragraph** below. Pill sub-navigation. A fanned row of cards around one central device (our scene cards could fan around a framed video) | Dense carousels |
| `05-google-about*.png` | about.google | **Regular-weight (400) headline**, generous white, one blue action | Full-bleed product photography |
| `06-things*.png` | culturedcode.com/things | The purest "Apple-indie" page: app icon, name, one paragraph, a "Watch Introduction Video" link, then a calm product shot. **Section header pattern: icon + title + paragraph + "See features ›"** | Skewed 3D screenshot (a dated effect) |
| `07-linear-long.png` | linear.app | **Two-tone headline:** statement in ink, explanation in grey in the same sentence ("A new species of product tool. *Purpose-built for…*") | Dark mode as default; the hero didn't render in headless mode |
| `12-stripe*.png` | stripe.com | The **same two-tone headline** device (confirms the pattern) | Gradient ribbon; dense nav |
| `16-superhuman*.png` | superhuman.com | Two-tone headline again; **pill CTA plus "Learn more ›"** | Purple banner; cookie panel covers the fold |
| `11-vercel-geist*.png` | vercel.com/font | Geist set huge with a **full stop as a design element** ("Geist.") | Grid-line decoration (an AI-template look) |
| `15-granola*.png` | granola.ai | Warm, human; left-aligned hero with a product window | Big serif display (not our type), olive palette |
| `14-kurzgesagt*.png` | kurzgesagt.org | Explainer-genre reference: illustration *is* the brand | Space-navy palette (theirs) |
| `08-raycast*.png`, `09-arc*.png` | raycast.com, arc.net | Kept as **counter-examples** | Neon gradients and playful wavy edges: the opposite of Apple-clean |
| `10-family*.png` | family.co | (Captured mostly blank: client-side animation.) | — |
| `13-muji` | muji.com/us | **Not captured** (the site timed out in headless mode) | — |

## Patterns adopted for the Whyfold landing page (apps/web/app/Landing.tsx)
1. **Hero:** one huge line ("Explain anything."), one grey sentence, **one red pill + one "›" text link** (Apple).
2. **The real product as the hero:** the video sits in a **light-grey rounded panel** (Apple's product panels).
3. **Two-tone section headlines:** statement in ink, the explanation in grey (Linear, Stripe, Superhuman).
4. **One idea per screen-tall section**, with very large vertical spacing (Apple, Things).
5. **Regular/semibold weights, tight tracking at large sizes**; never heavy black (Google, Apple).
6. **Full stop as punctuation-as-design** in the closing line (Vercel "Geist.").
