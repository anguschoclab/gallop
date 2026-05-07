---
name: Design principles
description: Seven rules-of-thumb that decide tie-breakers in design
type: foundation
status: Stable
owns: design:design-system
---

# Design principles

When two reasonable designs are on the table, these principles break the tie. They are deliberately opinionated.

---

## 1. Numbers are the protagonist

Stats, times, prize money, and Beyer figures get the strongest visual treatment on a card. Decoration earns its place by serving them.

**Do** — Use `tabular-nums` for any column or row of numbers. Right-align numeric table columns. Bold the headline figure in a card; let everything else step back.

**Don't** — Burst the numbers in glow effects, drop shadows, or tilted angles. Don't pair numbers with emoji that compete with the digits.

> Why: this game _is_ the numbers. If a player can't scan a row of horses and tell you who's fastest, the screen has failed.

---

## 2. Authenticity, not gatekeeping

Use the real word. Then make sure no one is left behind.

**Do** — Write _"G1 Stakes"_, _"Beyer 102"_, _"3yo Maiden"_, _"covered by"_, _"in foal to"_. Wrap any racing-jargon term in a `<Tooltip>` the first time it appears on a screen.

**Don't** — Translate to "Tier-1 Big Race" or "Speed Score 102" or "horse is pregnant". That patronises veterans and teaches newcomers nothing.

> Why: the player who learns _Beyer_ on day one knows _Beyer_ forever, in the game and outside it. That's a gift.

---

## 3. The race day thread

Silk colours, surface textures, weather cues, and the broadcast palette are not race-screen-only. They thread quietly through management screens.

**Do** — Show the silk dot beside every horse name. Use the surface palette tone in horse cards (subtle). Re-use the same emerald accent on "race day" CTAs.

**Don't** — Treat the race screen as a different product. Don't ship two design systems.

> Why: the moment a player enters a race, the visual continuity should make them feel "yes, this is what I came for".

---

## 4. Density without claustrophobia

Stable management is a dense domain. Embrace it — but breathe.

**Do** — Use 12px / 16px / 24px gaps consistently. Pair a dense table with a roomy header. Let card whitespace earn the density inside it.

**Don't** — Cram three different densities into one screen. Don't pad numbers so wide they stop scanning as a column.

> Why: data-forward UIs fail at extremes. Too dense and the eye can't lock in; too airy and the player feels they're being condescended to.

---

## 5. One verb per screen

Every screen has a primary verb (Train, Breed, Enter, Bid, Watch). The primary CTA is the single most prominent button on the page.

**Do** — Place the primary verb top-right or in the header. Let it be the only `variant="default"` Button visible without scroll.

**Don't** — Surface five equally-weighted CTAs and ask the player to choose.

> Why: when every action shouts equally, the player freezes.

---

## 6. State is visible, not implied

If something is loading, empty, in-progress, or failed, the screen says so out loud.

**Do** — Use `Skeleton` for loading. Write empty states with racing flavour. Show pregnancy as a `PregnancyTimeline`, never as "?". Surface auto-sim status with a real indicator.

**Don't** — Hide a spinner in a corner. Show a blank table with "No data". Make the player wonder whether the game is paused, broken, or waiting on them.

> Why: a sim with hidden state feels haunted.

---

## 7. The race screen is the constitution

When the management UI and the race UI disagree, the race UI wins. Tokens, terms, silks, surfaces — they all flow from race day.

**Do** — Pull tokens from the race screen back into the system (formalising a `broadcast` theme). Keep silk colour rendering identical everywhere.

**Don't** — Restyle silks differently on the dashboard than they appear on the track. Don't let "convenient hex codes" creep in away from the race screen.

> Why: see principle 3. The race is the climax; the rest of the product owes it consistency.

---

## How to apply these

When critiquing a design (your own or a teammate's), walk these in order. The first principle that surfaces a problem is usually the right one to fix. See [Critique heuristics](../07-quality/02-critique-heuristics.md) for the full review checklist.
