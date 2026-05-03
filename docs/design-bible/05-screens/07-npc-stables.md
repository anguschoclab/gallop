---
name: NPC stables
description: Rival stables — scout the field, learn the meta
type: screen
status: Stable
owns: engineering:documentation
---

# NPC stables

## At a glance

- **Route:** `/npc-stables` ([npc-stables.tsx](../../../src/routes/npc-stables.tsx)) and `/npc-stables/$stableId` ([npc-stables.$stableId.tsx](../../../src/routes/npc-stables.$stableId.tsx))
- **Persona:** Maya (form study), Tomás (rival pedigrees), Alex (rivalry narrative).
- **Primary verb:** Scout.
- **Layout:** AppShell.

## Purpose

There are 20+ AI-driven rival stables. Each has a personality (aggressive, breeder, prestige, conservative). The player needs to know who they're racing against.

This screen is the **meta layer** — what's happening in the wider sport. Maya wants to know which stable is on a hot streak; Tomás wants to know whose stallions are hot; Alex wants a villain.

## User journey

1. Player notices a rival keeps winning.
2. Goes to `/npc-stables`.
3. Sorts by recent wins, top horse, total earnings.
4. Drills into the rival → their roster, their style, their stallion shed.
5. Plans accordingly: maybe avoid that race, maybe enter and play for second.

## Layout

### List

```
┌─ Header: "Rival stables" ───────────────────────┐
├─────────────────────────────────────────────────┤
│ Sort: [Recent wins ▼]  Filter: [Style ▼]        │
├─────────────────────────────────────────────────┤
│ Stable Name  │ Style       │ Top horse │ $YTD   │
│ Alkmene Bd   │ Breeder     │ Galileo II│ $4.2M  │  ← scannable rows
│ Crimson R    │ Aggressive  │ Bullet    │ $3.1M  │
│ ...                                              │
└─────────────────────────────────────────────────┘
```

### Detail

```
┌─ Header: silk-row + stable name + style chip ──┐
├────────────────────────────────────────────────┤
│ Tabs: [Roster] [Stallions] [Recent races]      │
├────────────────────────────────────────────────┤
│ Roster — HorseCard grid (fog-of-war on stats)  │
└────────────────────────────────────────────────┘
```

**Fog-of-war**: rival horses show stats in ranges (*"Speed 70–85"*) rather than exact values, mirroring FM's scout system. The longer the player races against them, the tighter the range.

## Components used

- Primitives: `Card`, `Table`, `Tabs`, `Badge`.
- Domain: `HorseCard` (rival variant — fogged stats), `BeyerBadge`.

## Copy

- Title: *"Rival stables"*.
- Style badge values: *"Aggressive"*, *"Conservative"*, *"Breeder"*, *"Prestige"*, *"Volume"* (one chip per stable).
- Stat range copy: *"Speed 70–85"* (don't show *"Speed: ?"*).
- Empty: *"No data yet — race against them to learn more."*

## States

- Default list.
- New stable (no race history yet) — copy *"Newly entered. No record yet."*
- Drilled detail with tabs.

## Accessibility

- Range values must include `aria-label` (*"Speed estimate, between 70 and 85"*) for screen readers.

## Open questions

- Should we show the rival's *best result against the player* as a stat (head-to-head record)? Tracked.
- Do rivals have voiced personality copy? Probably not — too costly to maintain at scale.
