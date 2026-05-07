## Horse Racing Stable Manager

A single-player browser game where you run a stable: buy and train horses, enter them in races, and watch animated 2D races play out. All progress saved locally in the browser.

### Core gameplay loop

1. Start with a small cash balance and 2 starter horses.
2. Train horses to improve stats (speed, stamina, acceleration).
3. Browse the race calendar and enter eligible horses for an entry fee.
4. Watch the race animate live; collect prize money on a podium finish.
5. Repeat: buy better horses at auction, expand the stable.

### Pages / routes

- `/` — Dashboard: cash, stable size, next race, recent results, quick actions.
- `/stable` — Grid of your horses with stats, energy, and form.
- `/stable/$horseId` — Horse detail: full stats, training actions, race history.
- `/races` — Race calendar: upcoming races with distance, purse, entry fee, class. Enter a horse here.
- `/race/$raceId` — Live animated 2D race view + result screen.
- `/market` — Auction house: buy new horses (randomly generated, varying quality/price).

### Horse model

Each horse has: name, age, color (silks color), and stats: Speed, Stamina, Acceleration, Consistency (0–100). Plus Energy (0–100, drops with training/racing, restores daily) and Form (recent performance modifier). Stats grow slowly with training; older horses cap out.

### Training

Per-horse daily actions: Speed work, Endurance run, Sprint drills, Rest. Each costs energy and a small fee, and gives a chance-based stat bump. Limited training slots per "day" — advancing the day refreshes energy and rolls the race calendar forward.

### Race simulation

- 2D side-on track view: lanes drawn horizontally, horses as colored silks circles with numbers, scrolling background.
- Each frame, every horse's velocity is computed from its stats + a stamina curve + small noise, so results are stats-driven but not deterministic.
- Race length: 1000–2400m, takes ~20–40 seconds to play out. Skip/2x speed buttons.
- Live position board on the side updates as positions change. Photo-finish for close calls.
- Result screen: finish order, times, prize payouts, energy drain, form change.

### Economy & progression

- Entry fees scale with race class (Maiden → Allowance → Stakes → Group).
- Prize pool split 60/25/10/5 for top 4.
- Auction refreshes each day with 4–6 new horses across price tiers.
- Daily upkeep cost per horse (feed/stabling) — encourages active management.

### Persistence

All game state (horses, cash, day number, race calendar, market listings) saved to `localStorage` via a single Zustand store with persist middleware. New Game button resets everything.

### Visual style — clean modern dashboard

- Light theme with one strong accent (deep emerald green for "turf"), neutral slate UI.
- shadcn cards, tables, badges, progress bars for stats.
- Sidebar nav with sections (Dashboard, Stable, Races, Market).
- Race screen breaks the dashboard mold: full-bleed track with HUD overlay.
- Subtle fade/scale animations; numbers tick up on payouts.

### Technical notes

- TanStack Start file-based routing; one route per page above.
- Game state: `zustand` + `persist` to localStorage. All simulation pure functions in `src/game/` (horseGen, training, raceSim, economy) for testability.
- Race animation: `requestAnimationFrame` loop driving SVG/absolute-positioned horse elements; race outcome computed frame-by-frame, not pre-rolled, so the visual matches the result.
- No backend, no auth, no Lovable Cloud needed.

### Out of scope (v1)

Breeding, jockey hiring/management, multi-stable competition, owning a track, online multiplayer. Easy to add later.