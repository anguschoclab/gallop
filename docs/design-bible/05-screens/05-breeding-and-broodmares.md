---
name: Breeding and broodmares
description: The pedigree workshop — sire matching, mare management, foal projections
type: screen
status: Stable
owns: engineering:documentation
---

# Breeding and broodmares

Two related screens. Tomás's home turf.

## At a glance

|                  | Breeding                                                       | Broodmares                                                           |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Route**        | `/breeding` ([breeding.tsx](../../../src/routes/breeding.tsx)) | `/broodmares` ([broodmares.tsx](../../../src/routes/broodmares.tsx)) |
| **Persona**      | Tomás (deeply), Maya (statistically)                           | Tomás                                                                |
| **Primary verb** | Match (cover a mare with a sire)                               | Manage (track pregnancies, foaling)                                  |
| **Layout**       | AppShell                                                       | AppShell                                                             |

## Purpose

**Breeding** — the matchmaking tool. Pick a mare; pick a sire; see compatibility; cover.

**Broodmares** — the dam roster. Multi-mare pregnancy timeline. Who's open, who's in foal, when foaling is due.

## User journey

### Breeding

1. Player wants to breed _Athena_ (a mare).
2. Goes to `/breeding`.
3. Picks Athena from the mare selector.
4. Browses sire options — owned stallions, or external (paid) covers.
5. For each candidate, sees the `BreedingRadarChart` overlay: where the cross is strong / risky.
6. Checks dosage profile of expected foal.
7. Confirms cover — Athena moves to "in foal".

### Broodmares

1. Player checks daily.
2. Sees a list of mares — open / in foal / nursing.
3. Drills into a mare → her own `PregnancyTimeline` and lineage.

## Layout

### Breeding

```
┌─ Header: "Breeding" ────────────────────────────────────┐
├─────────────────────────────────────────────────────────┤
│ ┌─Mare picker───┐  ┌─Sire candidates────────────────┐   │
│ │ [Search]      │  │ Filter: [Owned] [External]     │   │
│ │ Athena ✓      │  ├────────────────────────────────┤   │
│ │ Brigid        │  │ HorseCard rows...              │   │
│ │ ...           │  └────────────────────────────────┘   │
│ └───────────────┘                                       │
├─────────────────────────────────────────────────────────┤
│ Selected pair: Athena × Galileo II                      │
│ ┌─Compatibility radar────────┐ ┌─Projected dosage──┐    │
│ └───────────────────────────┘ └───────────────────┘     │
│           [Confirm cover — $40,000]                     │
└─────────────────────────────────────────────────────────┘
```

### Broodmares

```
┌─ Header: "Broodmares" ──────────────────────────────────┐
├─────────────────────────────────────────────────────────┤
│ BreedingTimeline (multi-mare horizontal timeline)       │
├─────────────────────────────────────────────────────────┤
│ Mare list with status pills + due dates                  │
└─────────────────────────────────────────────────────────┘
```

## Components used

- Domain: `BreedingRadarChart`, `BreedingTimeline`, `PregnancyTimeline`, `Lineage`, `HorseCard`, `HorseBits`.
- Primitives: `Tabs`, `Card`, `Button`, `Select`, `Combobox`.

## Data

- `useGame((s) => s.horses)` filtered to mares / stallions.
- Compatibility derived in [src/game/breedingCompatibility.ts](../../../src/game/breedingCompatibility.ts).
- Foal genetics: [src/game/foalGen.ts](../../../src/game/foalGen.ts).

## Copy

- Cover CTA: _"Confirm cover — $40,000"_.
- Mare status badges: _"Open"_, _"In foal"_, _"Nursing"_, _"Retired"_.
- Confirm modal: _"Cover Athena with Galileo II?"_ / _"Stud fee: $40,000. Foal expected Year 4, Mar 22."_ / `[Cancel]` `[Confirm cover]`.
- Empty mares: _"No mares yet."_ / _"Buy a mare at the auction or retire one of your fillies."_

## States

- Default — mare/sire pickers, compatibility view.
- Mare not selected — empty right pane: _"Select a mare to begin."_
- Sire not selected — empty radar: _"Pick a sire to see compatibility."_
- Cover confirmed — mare moves to in-foal, success toast, screen returns to mare picker.
- Mare ineligible — disabled card with reason (_"Already in foal"_).

## Accessibility

- Compatibility radar must have a textual fallback table (top 3 strengths / weaknesses).
- All ancestor names in `Lineage` are tab-focusable links.

## Open questions

- Should we surface "famous crosses" (e.g. _Northern Dancer × Ribot_) as a discoverability layer for Tomás? Future.
- Where does _embryo transfer_ fit, if introduced? Probably as a checkbox option at cover time.
