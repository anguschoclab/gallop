---
name: Personas and research
description: Player archetypes Gallop serves, and the research frame for validating them
type: foundation
status: Draft
owns: design:user-research
---

# Personas and research

Three archetypes drive every design decision in Gallop. They're composites — not real people, but recognisable behaviours we've seen in peer-genre forums, sub-reddits, and our own playtesting notes. Every screen must clearly serve at least two of them.

---

## P1 — The Numbers Trainer ("Maya")

> *"Show me the spread on his last three Beyers and I'll tell you whether to enter him."*

**Who.** Lifelong sim-player. Came from Football Manager, Out of the Park Baseball, or sports-card simulators. Builds spreadsheets for fun.

**Goals.** Optimise. Find the edge. Every horse is a project; every race is data.

**Behaviours.**
- Sorts tables by every column to learn the underlying distribution.
- Reads tooltips, then never again.
- Hates unjustified UI animation.
- Will discover any quantitative lie within hours.

**Frustrations.**
- Stats hidden behind tabs, accordions, or modals.
- Numbers without units, or with sloppy precision (e.g. *87.43*% when 87% would do).
- Charts where the axis labels lie about the values.

**What Gallop must do for Maya.**
- Tabular numerics everywhere.
- Sortable tables on every list screen.
- Beyer trend visible without leaving the dashboard.
- Exact figures behind every chart, on hover or click.

---

## P2 — The Romantic Breeder ("Tomás")

> *"That filly is by Galileo out of a Storm Cat mare. Of course I want her."*

**Who.** Read every page of the Wikipedia Triple Crown article. Owns a paperback edition of *The Federico Tesio Method*. Will spend three real-time hours building a pedigree before they even click "Race".

**Goals.** Build a dynasty. Watch a family line emerge across generations. Validate a long-term breeding theory.

**Behaviours.**
- Hovers every horse name in a pedigree to read its record.
- Compares dam line to sire line obsessively.
- Will pay 5x for a mare with the right fourth-dam.
- Treats a stakes win by their homebred as a personal achievement.

**Frustrations.**
- Pedigrees that don't link upward.
- Lineage that flattens into "good genes / bad genes" without showing where.
- No way to see siblings.

**What Gallop must do for Tomás.**
- `Lineage` component is interactive — every ancestor tappable.
- Dosage chart visible on horse detail.
- Sibling list available on broodmare detail.
- "By X out of Y" copy treatment everywhere a foal is referenced.

---

## P3 — The Tourist ("Alex")

> *"I just like watching the little guys run."*

**Who.** Found Gallop because they liked Pocket Card Jockey, or watched a Belmont broadcast and wanted to play the manager once. Doesn't know what a furlong is yet.

**Goals.** Have fun. Win a few races. Maybe one day breed a champion. Mostly: see the next race.

**Behaviours.**
- Skips text. Clicks the biggest button. Skips text again.
- Watches every race at 1× speed, with full screen.
- Re-plays a great race rather than entering the next one.
- Treats every term as transparent or invisible — *Beyer* is a number that's bigger or smaller; that's enough today.

**Frustrations.**
- Walls of text.
- A primary CTA that isn't obvious.
- Terms with no tooltip on first encounter.
- Race screens with too many controls.

**What Gallop must do for Alex.**
- One verb per screen.
- Primary CTA distinct, always top-right.
- Tooltips on every jargon term, *first encounter only*, with a "don't show again" affordance.
- Race screen has obvious play/pause/skip; complexity hides behind a settings affordance.

---

## How the personas combine

Most screens serve **Maya + Tomás** (data + pedigree depth) or **Maya + Alex** (data + obvious next step). The rare screen that serves all three (Dashboard, Recap) is the highest-leverage screen on the product.

The race viewer is the only screen that serves **Tomás + Alex** primarily, with Maya as a power-user — see [05-screens/04-race-viewer.md](../05-screens/04-race-viewer.md).

---

## Research questions to validate / kill these personas

If/when the team runs playtests, these are the questions worth answering:

1. Does Maya actually use sorts, or does she bounce off because they're too slow?
2. Does Tomás care about *seeing* siblings, or just knowing they exist?
3. Does Alex understand the Beyer number after their tenth race, or does it stay opaque?
4. Is there a fourth archetype we're missing — a *speedrunner*, a *roleplayer*, a *historian*?

Interview guide and synthesis frame: see `design:user-research` and `design:research-synthesis` skills.

---

## Open questions

- Should we ship a "first run" tooltip pass tied to Alex specifically, or trust the universal tooltip pattern to do the job?
- Is "Tourist" the right name? Some teammates have argued for "Owner-spectator". Revisit after first playtest.
