---
date: 2026-05-12
topic: Terminology Purge — remove military/tech register
status: approved
---

# Terminology Purge — Design Spec

## Problem

A prior design pass introduced a military/ops-room aesthetic (monospace terminals, green-on-black, uppercase tracking) that bled into the copy layer. Terms like "Deployment", "Asset", "Intel", "System Day", "Mission Parameters", and "Target" now appear throughout routes and components. This conflicts with the established voice (see `docs/design-bible/02-voice/01-voice-and-tone.md`): Gallop uses **real horseracing terminology**, not tech/military jargon.

The visual style (dark terminal aesthetic) stays. Only the copy changes.

## Scope

17 files: 9 route files, 7 component files, 1 new design-bible file.

No logic changes. No data model changes. Pure copy/label substitution.

## Replacement Map

### "Asset" → horse or appropriate noun

| Current                       | Replacement      | Context                           |
| ----------------------------- | ---------------- | --------------------------------- |
| Asset Dossier                 | Horse Profile    | HorseCard comment                 |
| Asset Inventory               | Equipment        | stable.$horseId section header    |
| Registry of Assets            | Horse Registry   | stable.index page title area      |
| Identified Asset              | Horse            | stable.index table header         |
| Eligible Assets               | Eligible Horses  | auction.index sidebar             |
| Assets Catalogued             | Lots Listed      | auction.index sale row            |
| Asset Class                   | Category         | auction.index table header        |
| Asset Procurement Division    | Horse Market     | market.tsx subtitle               |
| Liquid Assets / Liquid_Assets | Cash on Hand     | FinancialReport, npc-stables      |
| Assets Sold                   | Lots Sold        | auction.$saleId stats             |
| Total Assets                  | Total Horses     | npc-stables.$stableId             |
| Asset / Rider                 | Horse / Jockey   | ResultOverlay table header        |
| Asset Sync Failure            | Data Unavailable | auction.$saleId empty state       |
| Asset_Verified                | Confirmed        | auction.$saleId lot badge         |
| Consign Asset                 | Consign          | stable.$horseId button            |
| Zero Assets Detected          | No Horses        | npc-stables.$stableId empty state |
| Asset Roster                  | Horse Roster     | npc-stables.$stableId section     |
| Assets: N                     | Horses: N        | npc-stables.$stableId header stat |
| Public Asset Exchange         | Public Sales     | auction.index page title          |

### Deployment → racing terms

| Current                       | Replacement        | Context                        |
| ----------------------------- | ------------------ | ------------------------------ |
| Deployment & Disposition      | Racing & Status    | stable.$horseId section header |
| Deployment Ready              | Available to Race  | stable.$horseId status         |
| Stable Deployment             | Staying in Stable  | stable.$horseId status         |
| Deployment Dock               | Consign to Sale    | auction.index sidebar section  |
| Deployment_Performance_Matrix | Graded Race Record | GradedStatsChart               |
| Deployment (auction column)   | Enter              | auction.index table header     |

### Intel / Signal / System → plain English

| Current                        | Replacement        | Context                      |
| ------------------------------ | ------------------ | ---------------------------- |
| Intelligence Feed              | News Feed          | index.tsx section label      |
| Intelligence Brief             | Latest News        | Gazette.tsx link             |
| Scouting_Intel_Readout         | Scouting Report    | auction.$saleId panel header |
| Reset Intel Filters            | Reset Filters      | JockeyRoster                 |
| System Day                     | Season Day         | auction.$saleId, staff.tsx   |
| No Intelligence Data Available | No data available  | stable.index empty state     |
| No Catalog Data Detected       | No Lots Listed Yet | auction.$saleId empty state  |

### Dashboard

| Current          | Replacement    | Context                       |
| ---------------- | -------------- | ----------------------------- |
| Manage Assets    | Manage Horses  | index.tsx card                |
| Upcoming Targets | Upcoming Races | index.tsx section             |
| Mission Plan     | Race Plan      | stable.index column / tooltip |

## Design Bible Update

New file: `docs/design-bible/02-voice/03-anti-patterns.md`

Contains:

- Explicit banned-term list (the table above)
- Rule: no military/ops/tech register in copy
- Rule: visual aesthetic (dark, monospace, uppercase) is independent of copy register
- Reference to `01-voice-and-tone.md` for the positive model

## Out of scope

- Variable names (`followTarget`, `consignTarget`, `dayTarget`) — internal identifiers, never user-visible
- Icon choices (Target icon from lucide) — visual only, no user-visible label
- Comment text in source files — not user-visible
- The terminal/dark visual aesthetic itself — stays unchanged
