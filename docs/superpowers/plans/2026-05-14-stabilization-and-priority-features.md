# Plan: Build Stabilization + 4 Priority Features

## Reality check

The build currently has ~1,100 pre-existing TS errors (missing `Transaction` export, `FILLER_PREFIXES`, `SILK_PALETTE`, narrow `RaceEntry` step union, untyped `SyndicateMarket`, auction button variants, etc.). Nothing new should ship until that is green — features built on a red build are unverifiable and tend to mask real regressions.

So this is a 5-phase plan: **Phase 0** clears the deck, then one phase per priority feature.

---

## Phase 0 — Stabilize the build (prerequisite)

Goal: `bunx tsc --noEmit` exits clean.

Clusters to fix in order (each is mostly mechanical):

1. **Missing exports**
   - `Transaction` type → re-export from `src/game/types.ts` (currently defined in a slice).
   - `FILLER_PREFIXES`, `SILK_PALETTE` → export from their data modules.
2. **`RaceEntry.tsx` step union** — widen the stepper state to include all 4–5 actual steps used in the JSX.
3. **`SyndicateMarket.tsx`** — add prop/state types; remove implicit `any`.
4. **Auction `Button` size variants** — align with the actual `buttonVariants` cva (`sm | default | lg | icon`).
5. **AI imports** — fix bad paths in `npcCycleAI` consumers.
6. **Misc untyped helpers** — sweep with `tsc --noEmit` and resolve cluster by cluster.

Estimate: ~2–3 hours of mechanical work, no product decisions needed.

### Phase 0 hygiene — no stray compiled JS in `src/` ✅

Symptom encountered: 58 compiled `.js` files (e.g. `inboxSlice.js`, `weatherPhase.js`,
`pipeline.js`) ended up beside their `.ts` siblings under `src/`, shadowing the
TypeScript sources under Vite's resolution and reintroducing stale logic.

Hardening applied:

- **`tsconfig.json`** already sets `"noEmit": true` — `tsc` will not emit `.js`.
- **`.gitignore`** now excludes `src/**/*.js` while allow-listing `src/assets/**/*.js`
  (legitimate vendor scripts), so stray artifacts cannot be committed.
- **`scripts/check-no-stray-js.sh`** fails if any `.js` appears under `src/`
  outside `src/assets/`. Exposed as `bun run check:no-stray-js` in `package.json`;
  run it in CI / pre-commit.

Rule: source modules under `src/` are authored as `.ts`/`.tsx`. The only `.js`
files permitted in the tree live in `src/assets/` (vendored libraries).

---

## Phase 1 — Jargon Tooltips + Progressive Disclosure

Smallest, highest-leverage UX win. Pure presentation layer.

**Tooltips** (`JargonTooltip.tsx` already exists)
- Create `src/lib/jargon.ts` — dictionary keyed by term: `{ furlong, beyer, claiming, allowance, dosage, dirt, turf, synthetic, blueHen, ... }` → `{ short, long }`.
- Build `<Jargon term="beyer">Beyer</Jargon>` wrapper that renders dashed-underline + tooltip from the dictionary.
- Sweep ~15 high-traffic components (RaceCard, HorseCard, RaceEntry, BreedingPanel, AuctionLot) and wrap matching terms.

**Progressive Disclosure on HorseCard**
- Add `scoutGrade(stat: number) → "S"|"A+"|...|"D"` helper in `src/core/horse/grading.ts`.
- HorseCard default view: letter grades + silk + name + age.
- "Advanced metrics" toggle (per-card, persisted in zustand UI slice) reveals raw numerics, genotype, chromosomes.
- Global default = simple; sticky once toggled.

---

## Phase 2 — Inbox / Message Center

The new game-loop hub. Replaces "hunt through menus".

**Data model** (`src/game/store/slices/inboxSlice.ts`)
```ts
type InboxMessage = {
  id: string; day: number; readAt?: number; pinnedUntil?: number;
  category: "foaling" | "offer" | "race" | "deadline" | "injury" | "staff" | "auction" | "system";
  priority: "info" | "action" | "urgent";
  title: string; body: string;
  cta?: { label: string; route: string; params?: Record<string, string> };
};
```
Actions: `pushMessage`, `markRead`, `markAllRead`, `dismiss`, `pinUntil`.

**Producers** — wire existing pipeline events to push messages:
- Foaling tick → `foaling`
- Auction bid received / lot won-lost → `offer` / `auction`
- Race entry deadline within N days → `deadline`
- Injury onset → `injury`
- Staff contract expiring → `staff`

**UI**
- Header bell icon with unread count badge.
- `/inbox` route: filter chips (All / Action Required / Today), grouped by day, CTA buttons jump to relevant route.
- Dashboard widget: top 3 unread "action" messages.

---

## Phase 3 — Dynamic Weather → Track Degradation

`trackConditions.ts` already has the math; this phase adds a stateful weather sim feeding it.

**New: `src/core/weather/`**
- `weatherTypes.ts` — `WeatherState { trackId, day, pattern: "clear"|"overcast"|"shower"|"rain"|"storm", tempC, humidity }`.
- `weatherSim.ts` — Markov chain per-track keyed by climate zone (already in `trackConditions`). Daily transition seeded by `(day, trackId)` for determinism.
- `weatherSlice.ts` — `Map<trackId, WeatherState[]>` rolling 14-day buffer + 7-day forecast.

**Pipeline integration**
- Add a `weatherStep` to the daily `pipeline.ts` between `marketStep` and `racingStep`. Outputs go into the slice.
- `racingStep` reads today's weather → calls `calculateConditionChange(prev, weather, racesRun, maintenance)` → updates per-track condition.

**Drama hooks**
- If a Group/Graded race day gets a `pattern` jump of ≥2 (clear → storm) within 24h of post time → push **inbox message** (Phase 2 dependency): "Storm forecast at Churchill Downs — track downgraded to Sloppy ahead of the Derby".
- Race card UI: 7-day forecast strip (sun/cloud/rain icons) + current condition chip with `<Jargon term="sloppy">` tooltip.

---

## Phase 4 — Interactive Pedigree Tree

Replace text lineage view with a visual graph.

**Library**: `@xyflow/react` (React Flow v12). Lightweight, handles 4-gen trees fine.

**New: `src/components/breeding/PedigreeTree.tsx`**
- Input: `horseId`, `generations: 3|4|5`.
- Build node/edge graph by walking `horse.pedigree.sireId/damId` recursively (existing data).
- Layout: dagre (right-to-left, sires top, dams bottom) — `@dagrejs/dagre` peer.
- Node component: silk swatch + name + birth year + Beyer best. Color-coded by gender.
- **Inbreeding detection**: walk the tree, find any ancestor appearing ≥2 times. Mark all duplicate nodes with a colored ring (yellow = 4×4, orange = 3×3, red = 2×2 closer than 4 generations) and draw a dashed connector between their occurrences. Compute coefficient of inbreeding (Wright's formula, bounded depth) for the header chip.
- Click node → opens horse detail drawer (use existing `HorseDetailModal`).

**Mount points**: HorseDetail page → new "Pedigree" tab. Breeding compatibility view → side-by-side pedigree of proposed sire+dam with shared ancestors highlighted across both trees.

---

## Sequencing & estimates

| Phase | Scope | Est. |
|---|---|---|
| 0 | Build stabilization | 2–3h |
| 1 | Tooltips + Progressive Disclosure | 2–3h |
| 2 | Inbox (slice + producers + UI) | 4–6h |
| 3 | Weather sim + integration | 4–5h |
| 4 | Pedigree Tree (React Flow + inbreeding) | 4–6h |

Total: **~16–23 hours** of focused work. I'd ship one phase per turn so you can review and steer between phases.

## Out of scope (deferred to future plans)

Pace heatmaps, distance bell curves, isometric farm view, personality/morale deepening, jockey relationships, auction tension meter, sectional scrubber. Happy to plan any of these next once Phases 0–4 land.

## Recommendation

Approve Phase 0 first. Once the build is green, we ship Phase 1 (smallest, immediate visible polish), then Phase 2 which becomes the spine the other features hook into (weather alerts → inbox, pedigree warnings → inbox, etc.).