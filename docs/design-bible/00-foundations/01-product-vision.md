---
name: Product vision
description: Why Gallop exists, who it serves, what it is and is not
type: foundation
status: Stable
owns: design:design-system
---

# Product vision

## What Gallop is

A **single-player horse racing stable management sim**. The player owns a stable, trains and breeds horses, enters races, and grows their operation across seasons. Outcomes are simulated horse-by-horse with real physics (pace, stamina, energy, surface, weather) and real metrics (Beyer figures, dosage profiles, graded stakes ladder).

Think *Football Manager* married to *Photo Finish: Horse Racing* — the depth of a numerical sim with the visceral payoff of a live, animated race.

## What Gallop is not

- **Not a betting sim.** The player isn't gambling for outcomes; they're managing for them.
- **Not arcade.** No power-ups, no boost meters, no twitch input.
- **Not cartoon.** Authentic terminology, authentic colours, authentic stakes.
- **Not gated.** Real terms appear, but never as walls. Tooltips and a glossary are first-class.

## Who it's for

Three player archetypes, fully described in [Personas](03-personas-and-research.md):

1. **The Numbers Trainer** — wants to optimise stats, Beyer trends, training programmes.
2. **The Romantic Breeder** — wants pedigrees, blue-hen status, multi-generation lineage.
3. **The Tourist** — wants to feel the thrill of race day without studying a manual.

Every screen must serve at least two of these three.

## Pillars

The product is built on three pillars. Every design decision should make at least one of them stronger; never weaken any.

### 1. Authentic data, accessible UI

Real Beyer numbers, real pedigree dosage, real graded ladder. Surfaced in scannable cards, sortable tables, and clear charts — never in spreadsheets the player has to reverse-engineer.

### 2. Decisions over inputs

The player makes interesting choices (which race to enter, how to train this week, when to retire to stud), not tedious ones. UI removes friction from the decision and surfaces the trade-off.

### 3. Race day as the climax

Management screens feed the live race. The race is where bets, training, and breeding all pay off — visually, audibly, emotionally. The whole product flows toward that moment.

## Success criteria

- A player can name their stable's three best horses by stat, by pedigree, and by recent form within 30 seconds on the dashboard.
- A new player can enter their first race and understand what the result means within their first 10 minutes of play.
- A returning player can resume after a week away and know what to do next within 60 seconds.
- The live race feels like the same product as the dashboard — same silks, same colours, same vocabulary.

## Non-goals

- Real-time multiplayer (deferred — see [decision log](../08-extending/04-decision-log.md)).
- Mobile-first design (responsive, but desktop is the primary canvas).
- Esports-style spectator features.
- Paid cosmetics, microtransactions, or any monetisation pressure on UI.

## Open questions

- Will breeding ever exceed two generations of inheritance depth? Affects how much screen real estate `Lineage` deserves.
- Do we need a tutorial mode, or does the glossary + tooltip approach carry the load?
