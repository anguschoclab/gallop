---
name: Core loops
description: The four play loops that string Gallop's screens together
type: flow
status: Stable
owns: engineering:documentation
---

# Core loops

Screens don't exist in isolation. The player chains them into loops. Four loops carry most of Gallop's playtime; everything else is variations.

---

## Loop 1 — The day loop

The most frequent. The player advances time, evaluates, decides.

```
Dashboard ──► (decision: train? race? rest?)
   │
   ├──► Stable ──► Horse detail ──► Train ──► back to Stable
   │
   ├──► Races ──► Race detail ──► Enter ──► back to Races
   │
   └──► Advance day ──► Recap (if events) ──► Dashboard
```

**Cadence.** Multiple times per session. The day-advance click is the dominant action.

**Design implications.**

- Dashboard must orient in <10 seconds.
- _"Advance day"_ button must always be accessible (always in sidebar; mirrored on dashboard).
- Recap appears only when there's something to recap — quiet days don't interrupt.

---

## Loop 2 — The race day loop

The climax. Less frequent than the day loop, but the highest-stakes interaction.

```
Dashboard / Race calendar
   │
   ▼
PlayerRacePrompt (modal, mid-day-advance)
   │
   ▼
/race/$raceId  ── live race ──► Result overlay
   │                                │
   │                                ▼
   └──► (auto on Continue) ──► Recap or back to /races
```

**Cadence.** Several times per in-game week. Every one matters emotionally.

**Design implications.**

- The transition into `/race/$raceId` must feel ceremonial — the broadcast theme is a discrete switch, not a gradient.
- The result overlay is the most-read piece of copy in the product. It must read like a result, not a debug screen.
- Returning from `/race/...` should land on Recap if the race was significant, otherwise on `/races` — the player should never be lost.

---

## Loop 3 — The breeding loop

The slowest. Seasons-long. Tomás's heartbeat.

```
Broodmares ── identify open mare
   │
   ▼
Breeding ── pick sire (own / external)
   │
   ▼
Confirm cover (modal) ──► back to Broodmares
   │
   │  (time advances)
   │
   ▼
Mare confirmed in foal ──► PregnancyTimeline visible
   │
   │  (months pass)
   │
   ▼
Foal born ──► Recap highlight ──► Stable (foal is now a horse)
   │
   │  (months/years pass)
   │
   ▼
Foal trains, races, breeds ──► Lineage extends
```

**Cadence.** Initiated once per mare per season. The follow-up touchpoints stretch across in-game years.

**Design implications.**

- Pregnancy state must be visible everywhere the mare is mentioned (principle 6).
- Foal birth is a recap-level event, not a toast.
- The lineage page must remain stable across years — links from old foals should never break.

---

## Loop 4 — The auction loop

Daily refresh, opportunistic.

```
Dashboard ──► (notification: "n new lots") ──► /auction
   │
   ▼
Auction list ──► /auction/$saleId
   │
   ▼
Place bid ──► (NPCs counter-bid) ──► won OR outbid
   │                                       │
   ▼                                       ▼
Stable (new horse arrives)          back to Auction list
```

**Cadence.** Daily, optional. The player might skip several days between auction visits.

**Design implications.**

- Auction empty state isn't an error — it's expected if the player visits late in the day after lots are sold.
- Won-lot toast is celebratory but brief — the player isn't on the dashboard yet.
- Outbid is informational, not punitive.

---

## Cross-loop hand-offs

Loops aren't watertight. The transitions between them are the high-value design moments:

| From                     | To                                                                                                                    | Pattern |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------- |
| Day loop → Race day loop | `PlayerRacePrompt` modal interrupts day-advance.                                                                      |
| Race day loop → Recap    | After result overlay, _"Continue"_ lands on Recap when the race was significant.                                      |
| Auction loop → Day loop  | Won lot returns the player to the auction list, not the new horse. They drill into the new horse on their own timing. |
| Breeding loop → Day loop | Confirmed cover returns to Broodmares, not Stable. The mare is the unit, not the just-conceived foal.                 |

---

## What we don't do

- **Forced progression.** No screen should auto-redirect the player. They click "Continue" or close themselves.
- **Silent state changes.** A horse retiring, foal aging up, or contract expiring must surface in Recap.
- **Modal-on-modal.** A modal cannot trigger another modal. Convert one to a sub-route or sheet first.

---

## Future loops (reserved)

| Loop                                                                            | Status                                                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Sales consigning** — selling a horse to other stables                         | In-design.                                                                                        |
| **Jockey contracting** — picking and retaining riders                           | Reserved.                                                                                         |
| **Career retirement** — long-arc end-of-life narrative for stallions/broodmares | Reserved.                                                                                         |
| **Multiplayer (head-to-head)**                                                  | Out of scope — see [00-foundations/01-product-vision.md](../00-foundations/01-product-vision.md). |

---

## Open questions

- Should the day loop have a **"do nothing today"** affordance? Currently the player just clicks Advance, but for active play the absence of action is awkward.
- Where does **AutoSim** (skip ahead through several days) sit in these loops? Today it's a sidebar button; it might deserve its own section in the day loop diagram.
