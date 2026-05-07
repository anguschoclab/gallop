# Gallop UI/UX Design Bible

> **The mantra:** _Numbers over noise. Authentic, never gatekeeping. Race day, every screen._

This bible is the single reference for how Gallop looks, feels, reads, and behaves. It exists so a new screen, component, or feature can be added without re-litigating the basics — and so the most demanding screen we have (the live race viewer) stays in lockstep with the calmest one (the dashboard).

**Audience:** designers, engineers, copywriters, anyone shipping pixels or strings into Gallop.

---

## How this bible is organised

The bible is layered: each layer depends only on the ones above it.

| Layer | Folder                                | Question it answers                                          |
| ----- | ------------------------------------- | ------------------------------------------------------------ |
| 0     | [00-foundations](00-foundations/)     | _Who is this for, and what are we trying to feel?_           |
| 1     | [01-design-system](01-design-system/) | _What are the raw materials — colours, type, motion, theme?_ |
| 2     | [02-voice](02-voice/)                 | _How do we sound?_                                           |
| 3     | [03-components](03-components/)       | _What pre-built parts can I assemble?_                       |
| 4     | [04-patterns](04-patterns/)           | _How do those parts come together?_                          |
| 5     | [05-screens](05-screens/)             | _What does each screen owe the user?_                        |
| 6     | [06-flows](06-flows/)                 | _How do screens chain into a play loop?_                     |
| 7     | [07-quality](07-quality/)             | _How do we know we got it right?_                            |
| 8     | [08-extending](08-extending/)         | _How do I add the next thing without breaking the system?_   |

---

## Reading paths

**I'm a new designer joining the project.**
Read in order: [Product vision](00-foundations/01-product-vision.md) → [Design principles](00-foundations/02-design-principles.md) → [Inspirations](00-foundations/04-inspirations.md) → [Tokens](01-design-system/01-tokens.md) → [Critique heuristics](07-quality/02-critique-heuristics.md). ~30 minutes.

**I'm an engineer about to implement a new screen.**
[How to add a screen](08-extending/03-how-to-add-a-screen.md) → [Screen template](05-screens/00-screen-template.md) → [Layout & navigation](04-patterns/01-layout-and-navigation.md) → [Primitives index](03-components/01-primitives.md) → [Design handoff](07-quality/03-design-handoff.md).

**I'm reviewing a PR and want to spot regressions.**
[Critique heuristics](07-quality/02-critique-heuristics.md) → [Accessibility](07-quality/01-accessibility.md) → [Voice & tone](02-voice/01-voice-and-tone.md).

**I'm trying to understand the live race screen.**
[Race viewer screen spec](05-screens/04-race-viewer.md) — it's the worked example that pulls on every other section.

---

## The mantra, expanded

| Phrase                           | What it means in practice                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Numbers over noise**           | Stats are the protagonist. Use tabular figures (`tabular-nums`), scannable density, monochrome backgrounds, no decorative chrome. If a chart and a table show the same thing, prefer the table. |
| **Authentic, never gatekeeping** | Use real terminology — Beyer, dosage, graded, furlong, blue hen, broodmare — but every term has a tooltip or glossary entry one tap away. The newcomer should never feel locked out.            |
| **Race day, every screen**       | Silk colours, surface textures, weather cues, and the broadcast palette thread quietly through management screens so the live race feels like the same product, not a guest appearance.         |

---

## Glossary (racing terms used by this product)

| Term                                      | Meaning                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Beyer**                                 | A speed figure (0–~120) standardising performance across distances/tracks.                     |
| **Dosage**                                | Pedigree-derived genetic profile across speed/stamina aptitudes.                               |
| **Graded race**                           | Top-tier race classification (G1 > G2 > G3 > Listed).                                          |
| **Stakes / handicap / claiming / maiden** | Race classes by entry conditions.                                                              |
| **Furlong**                               | 1/8 mile (~201 m). The natural unit for short distances.                                       |
| **Surface**                               | Turf, dirt, or synthetic — affects pace and outcome.                                           |
| **Track condition**                       | Firm/good/yielding/soft/heavy (turf) or fast/wet-fast/sloppy/muddy (dirt).                     |
| **Broodmare / dam / sire / foal**         | Mother / father / offspring.                                                                   |
| **Blue hen**                              | An exceptional broodmare proven to throw stakes winners.                                       |
| **Silk**                                  | The owner's racing colours, worn by the jockey — and the dot beside the horse on every screen. |
| **Stewards / scratch / withdrawal**       | Race-day decisions about entry.                                                                |

Glossary terms get a `<Tooltip>` wrapper everywhere they appear in the UI. See [UX copy patterns](02-voice/02-ux-copy-patterns.md).

---

## Skills → file map

This bible was authored by composing Claude design skills. Future contributors should re-invoke these when extending a section.

| File                                                                            | Owning skill                  |
| ------------------------------------------------------------------------------- | ----------------------------- |
| [03-personas-and-research.md](00-foundations/03-personas-and-research.md)       | `design:user-research`        |
| [04-inspirations.md](00-foundations/04-inspirations.md)                         | `design:research-synthesis`   |
| [01-design-system/\*](01-design-system/) and [03-components/\*](03-components/) | `design:design-system`        |
| [02-voice/\*](02-voice/)                                                        | `design:ux-copy`              |
| [07-quality/01-accessibility.md](07-quality/01-accessibility.md)                | `design:accessibility-review` |
| [07-quality/02-critique-heuristics.md](07-quality/02-critique-heuristics.md)    | `design:design-critique`      |
| [07-quality/03-design-handoff.md](07-quality/03-design-handoff.md)              | `design:design-handoff`       |
| [05-screens/00-screen-template.md](05-screens/00-screen-template.md)            | `engineering:documentation`   |

---

## File status legend

Every file in this bible carries a status in its frontmatter:

- **Stable** — current and trustworthy. Update when reality changes.
- **Draft** — written, but not yet reviewed by both design and engineering.
- **Needs review** — drift suspected. Treat with caution; reconcile against code.

---

## How to extend

Adding to Gallop without breaking the system:

- New colour or spacing value → [How to add a token](08-extending/01-how-to-add-a-token.md)
- New reusable component → [How to add a component](08-extending/02-how-to-add-a-component.md)
- New screen or route → [How to add a screen](08-extending/03-how-to-add-a-screen.md)
- New design decision worth remembering → append to [Decision log](08-extending/04-decision-log.md)

---

## Changelog

- **v0.1 (2026-05-03)** — Initial bible. Foundations, design system, voice, components, patterns, screens (incl. race-viewer worked example), flows, quality, extending.
