---
name: Copy anti-patterns
description: Banned terms and registers — what Gallop never writes
type: voice
status: Stable
owns: design:ux-copy
---

# Copy anti-patterns

The visual aesthetic (dark, monospace, uppercase tracking) is independent of the copy register. The terminal look is fine. Military and tech-ops jargon is not.

---

## The rule

**Horses are not assets. Races are not deployments. The stable is not a command centre.**

Gallop uses real horseracing terminology (see `01-voice-and-tone.md`). When the design borrows a dark/terminal visual style, the copy must not follow the aesthetic into a different domain.

---

## Banned terms and their replacements

| Never write                 | Write instead              | Notes                                           |
| --------------------------- | -------------------------- | ----------------------------------------------- |
| Asset / Assets              | Horse / Horses, Lot / Lots | Use "lot" in auction context, "horse" elsewhere |
| Asset class                 | Category                   | In auction table headers                        |
| Deployment                  | Racing, Enter, Consign     | Depends on context                              |
| Deploy / Deployed           | Enter / Entered            | For race entry status                           |
| Deployment Dock             | Consign to Sale            | Auction sidebar                                 |
| Mission / Mission Plan      | Race Plan                  | Campaign planning                               |
| Intel / Intelligence        | News, Report, Data         |                                                 |
| Intelligence Feed           | News Feed                  | Dashboard section                               |
| Intelligence Brief          | Latest News                | Gazette link                                    |
| Scouting Intel              | Scouting Report            | Auction horse panel                             |
| System Day                  | Season Day                 | Day counter in headers                          |
| Target / Targets            | Race / Races               | Never "upcoming targets"                        |
| Active Targets              | Races Listed               | Filter result count                             |
| Regional Clusters           | Regions                    | Geographic grouping                             |
| Mission Parameters          | Races                      | Filter result description                       |
| Signal Detected / No Signal | Found / Not Found          | Empty states                                    |
| Recalibrate sensors         | Adjust your filters        | Empty-state helper text                         |
| Liquid Assets               | Cash on Hand               | Financial displays                              |
| Asset Sync Failure          | Data Unavailable           | Error states                                    |
| Zero Assets Detected        | No Horses                  | Empty states                                    |
| Reset Intelligence          | Reset Filters              | Filter reset button                             |

---

## Why this matters

A player learning horseracing from Gallop should leave knowing what a "maiden", "claiming race", or "dosage index" means. They should not leave thinking races are "deployments" or horses are "assets" — those are words from a different game.

The tooltip layer (JargonTooltip) carries the load of explaining genuine racing terms. It cannot help if the terms themselves are wrong.

---

## The test

Read the copy aloud to someone who follows horse racing. If any phrase sounds like a military briefing or a fintech dashboard, rewrite it.
