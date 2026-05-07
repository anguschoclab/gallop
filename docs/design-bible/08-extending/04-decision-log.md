---
name: Decision log
description: Append-only record of design decisions worth remembering
type: extending
status: Living
owns: engineering:documentation
---

# Decision log

Append-only. Each entry is a decision that was made deliberately and could be questioned later. The log answers _"why does it work this way?"_ without anyone having to remember.

Format:

```
## NNNN — Title (yyyy-mm-dd)

**Status.** Active / Superseded by NNNN / Reversed
**Context.** What we were facing.
**Decision.** What we chose.
**Consequences.** What follows from it (good and bad).
```

Newest entries at the **bottom**. Don't edit old entries — supersede them.

---

## 0001 — OKLCH for all colour tokens (2026-05-03)

**Status.** Active.

**Context.** Choosing a colour space for the design system. Hex/HSL would be familiar; OKLCH would be perceptually uniform but less ergonomic to write by hand.

**Decision.** OKLCH. All primitive values use `oklch(L C H)`.

**Consequences.**

- Light/dark theme pairs are easier to keep balanced.
- Designers writing values by hand have a slightly higher learning curve.
- Token-to-Figma round-tripping (when we have a Figma) requires a converter.
- Banned: hex, rgb, hsl in `src/styles.css` and any component.

---

## 0002 — Sidebar nav is flat, 7 items (2026-05-03)

**Status.** Active.

**Context.** Considering nested nav (e.g. _"Stable" > "Mares" > "Stallions"_).

**Decision.** Flat sidebar with 7 destinations: Dashboard, Stable, Races, Rival Stables, Market, Breeding, Sales. Sub-paths reachable from inside parent screens.

**Consequences.**

- Adding an 8th item requires a vision-level conversation.
- Cross-screen flows (e.g. picking a sire from Breeding) become drill-in patterns, not nav patterns.
- Mobile-friendly without major rework.

---

## 0003 — Race screen breaks AppShell (2026-05-03)

**Status.** Active.

**Context.** Should the live race screen retain the management sidebar?

**Decision.** No. `AppShell` early-returns `<Outlet />` for any path starting with `/race/`. The race screen is full-bleed and owns its own chrome.

**Consequences.**

- The race feels like the climax (principle 7).
- Race screen must implement its own back-out / navigation.
- A future "background race" feature (race plays in a side panel) would require revisiting this.

---

## 0004 — Broadcast theme planned, not yet implemented (2026-05-03)

**Status.** Active (planning).

**Context.** Race screen uses inline emerald palette and yellow-400 accents. This is drift from the token system.

**Decision.** Don't fix piecemeal. Introduce a third theme variant — `broadcast` — with full token coverage. Document targets in [01-design-system/05-theming.md](../01-design-system/05-theming.md). Implement as a single coordinated change.

**Consequences.**

- Race screen continues with hardcoded colours until the broadcast theme lands.
- The bible documents the gap honestly, with a clear target.
- Shipping the broadcast theme also unlocks the _daylight broadcast_ variant for future light-mode race viewing.

---

## 0005 — No emoji in body copy except weather on race screen (2026-05-03)

**Status.** Active.

**Context.** Should we use emoji as visual punctuation in the UI?

**Decision.** No, with one exception: the race screen weather indicator (☀️ Sunny, etc.).

**Consequences.**

- Voice stays composed (principle in [02-voice/01-voice-and-tone.md](../02-voice/01-voice-and-tone.md)).
- Weather emoji are a _controlled_ exception — one per weather, used consistently. They don't leak elsewhere.
- Future internationalisation is simpler (emoji are universal-ish; emoji as decoration would create localisation inconsistency).

---

## 0006 — Silks are user-data colour, the only inline-style exception (2026-05-03)

**Status.** Active.

**Context.** Components must consume tokens, not inline colours. Silks are per-horse colour data — not theme.

**Decision.** Silks are the only acceptable inline `style={{ backgroundColor }}`. They are user-data, not design system. Always paired with a token-driven border (`border-white/40` on dark, `border` on light).

**Consequences.**

- The `<HorseSilk>` pattern (silk dot + border) is documented and consistent.
- A linter rule banning inline `style` colour values would need to whitelist this case.

---

## 0007 — Charts use `--chart-1` … `--chart-5` only (2026-05-03)

**Status.** Active.

**Context.** Charts could grow beyond 5 categories.

**Decision.** Cap at 5 series per chart. If you need 6, the chart is doing too much — split it.

**Consequences.**

- Visual consistency across charts.
- Some data is harder to visualise — e.g. all 8 horses on a race-pace chart need a different treatment (highlight + grey-out, or per-horse small multiples).

---

## 0008 — Grade colors use app theme tokens (2026-05-06)

**Status.** Active.

**Context.** Graded stakes (G1, G2, G3) need color coding. Options: traditional racing colors (yellow/slate/amber) vs app theme colors (fame/muted-foreground/info). The canonical `getGradeColorClass` in `src/core/race/grading.ts` used traditional colors, but several route files had duplicated implementations using app theme colors.

**Decision.** Use app theme colors (fame/muted-foreground/info) for consistency with the rest of the UI. G1 = fame (gold/celebratory), G2 = muted-foreground (silver/secondary), G3 = info (bronze/tertiary). Consolidate all grade color references to single source of truth in `src/core/race/grading.ts`.

**Consequences.**

- Visual consistency across all screens using grade badges.
- Eliminates duplicate grade color logic (DRY violation).
- Traditional racing enthusiasts may notice the color difference, but the semantic meaning (gold/silver/bronze hierarchy) remains clear.
- All inline `gradeLabelColor` constants and `getGradeColor` functions deleted from route files.

---

## How to add a new entry

Append to this file with the next number (`NNNN`). Don't backfill numbers; use the next available.

If the decision supersedes a prior one, mark the prior one **Superseded by NNNN** and link.

If the decision is reversed, mark the prior one **Reversed** and explain in the new entry.
