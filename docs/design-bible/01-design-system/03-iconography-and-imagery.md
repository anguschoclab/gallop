---
name: Iconography and imagery
description: Icons, horse sprites, surface textures, sky/weather backgrounds, silk colours
type: design-system
status: Stable
owns: design:design-system
---

# Iconography and imagery

Gallop uses a small, deliberate set of visual assets. The rule: every image earns its place by carrying meaning — never decoration.

---

## Icons

**Library:** [Lucide](https://lucide.dev/) — set once in [components.json](../../../components.json) (`"iconLibrary": "lucide"`).

**Standard size:** `h-4 w-4` (16×16) inside buttons and nav items. Bump to `h-5 w-5` (20×20) only for hero CTAs or empty-state illustrations.

**Stroke:** Lucide's default. Don't override `strokeWidth`.

**Colour:** inherit (`currentColor`). Pair the icon with text whose `text-*` class colours both.

**Current navigation icons** ([AppShell.tsx:4](../../../src/components/AppShell.tsx)):

| Icon        | Used for         |
| ----------- | ---------------- |
| `Home`      | Dashboard        |
| `Trophy`    | Stable           |
| `Calendar`  | Races            |
| `Building2` | Rival Stables    |
| `Store`     | Market           |
| `Heart`     | Breeding         |
| `Gavel`     | Sales / Auctions |
| `Plus`      | Advance day      |
| `Settings`  | AutoSim panel    |

**Don't** mix icon libraries. Don't ship raster icons. Don't use emoji _as_ icons in management UI (the race screen weather emoji is a controlled exception — see [02-voice/02-ux-copy-patterns.md](../02-voice/02-ux-copy-patterns.md)).

---

## Horse sprites

Located in [src/assets/](../../../src/assets/) and served from `/assets/horse-*.png`. These are 6-frame running sprite sheets, indexed by coat colour:

| Coat     | File                               |
| -------- | ---------------------------------- |
| bay      | `horse-b.png`                      |
| black    | `horse-bl.png`                     |
| chestnut | `horse-ch.png`                     |
| dark-bay | `horse-dkb.png`                    |
| gray     | `horse-gr.png`                     |
| roan     | `horse-roan.png` (also `.svg`)     |
| palomino | `horse-palomino.png` (also `.svg`) |
| white    | `horse-white.png` (also `.svg`)    |

**Status (2026-05):** these assets are referenced by the race viewer but **not yet rendered** — `HorseSprite` falls back to a coloured silk circle. See gap analysis in [05-screens/04-race-viewer.md](../05-screens/04-race-viewer.md).

**Plan:** when the sprite path lands, the race screen renders the actual coat-coloured horse. Management screens continue to use the silk dot — coat colour stays a race-day specific treatment, reinforcing the "race day, every screen" thread without redundancy.

---

## Track surface textures

| Surface   | File                                |
| --------- | ----------------------------------- |
| Turf      | `track-turf.png`                    |
| Dirt      | `track-dirt.png`                    |
| Synthetic | `track-synthetic.png` (also `.svg`) |

Used in [race.$raceId.tsx:13–24](../../../src/routes/race.$raceId.tsx). Repeated horizontally as the live track background.

**Future use beyond the race screen:** a tiny surface badge could appear next to a race entry on the race browser ("turf · firm"), using the same texture as a 12×12 swatch. This is principle 3 — race day, every screen.

---

## Sky / weather backgrounds

Available weather variants, each with a paired sky image:

| Weather | File(s)                      |
| ------- | ---------------------------- |
| Sunny   | `bg-sky-sunny.png`           |
| Cloudy  | `bg-sky-cloudy.png` (`.svg`) |
| Rainy   | `bg-sky-pouring.png`         |
| Sunset  | `bg-sky-sunset.png` (`.svg`) |
| Night   | `bg-sky-night.png` (`.svg`)  |

Used as a 200px-tall repeating-x band atop the emerald track gradient on the live race screen.

**Pattern:** any other "race day adjacent" screen (recap, race detail) may use the appropriate sky as a banner image — this is one of the strongest moves we have for tying screens to the broadcast feel.

---

## Silk colours

Silks are how the player and rivals are visually identified. Each horse has a silk colour stored on the runner; the colour is drawn as a circle (`h-5 w-5 rounded-full`) beside the horse's name everywhere the horse appears.

**Pattern:**

```tsx
<div className="h-5 w-5 rounded-full border border-white/40" style={{ backgroundColor: r.silk }} />
```

(`border-white/40` on dark backgrounds; `border` on light. Always border — the silk dot needs a stroke to read on either surface.)

**Source:** silks are stored on `Runner.silk` (per the type in [src/game/raceSim.ts](../../../src/game/raceSim.ts)) and assigned at horse creation. They are _never_ derived per-screen — this guarantees consistency principle 7 ("the race screen is the constitution").

**The "YOU" badge:** when `r.owned`, render a small `bg-yellow-400 text-black` chip beside the silk. Reserved for the player.

---

## Decorative imagery (and what we don't ship)

| Asset                  | Status                                            |
| ---------------------- | ------------------------------------------------- |
| `background-fence.png` | Decorative — race screen background fence detail. |
| `markers-steeple.png`  | Decorative — for steeplechase variants (future).  |
| `fast.png`             | Legacy — likely old loading/UI element. Audit.    |

**We do not ship:**

- Photographic horse imagery.
- Stock-photo backgrounds.
- Illustrations of jockeys, trainers, or owners as faces.
- Animated GIFs in management UI.

The sprite-and-silk model is the entire visual vocabulary for representing horses. Any deviation needs a decision-log entry.

---

## Open questions

- Should we add silk _patterns_ (stripes, halves, stars) like real racing colours, or stay with solid colours? The `HorseSprite.silk` field today is a single colour string.
- Should the surface texture become a tokenised gradient rather than a PNG, so the race screen can tint it for night races?
