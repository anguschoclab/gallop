# Specification: Gallop Imperial Expansion

**Status:** Draft / Validated (Brainstorming)
**Date:** 2026-05-10
**Owner:** Engineering / Design

## 1. Executive Summary

This expansion transforms Gallop from a single-stable management tool into an "Imperial" racing simulation. It targets the "Director of Racing" persona, allowing the player to manage 20–50 horses across global regions through automated staff systems, branching infrastructure, and deep psychological rivalries.

## 2. System 1: Periodization & Squad Training

### 2.1 The Fitness/Fatigue Model

The core simulation moves to a Banister Impulse Response model:

- **Fitness (Chronic):** Long-term potential built over months.
- **Fatigue (Acute):** Short-term cost of intensity.
- **Peaking Index (Form):** `Fitness - Fatigue`. High Form unlocks a horse's maximum Beyer potential.
- **Stamina/Recovery:** High-specialty facilities improve the rate of Fatigue decay.

### 2.2 Squad Management (Automation)

- **Squads:** Logical groupings of horses (e.g., "2yo Turf Sprinters").
- **Templates:** Automated sequences of training actions (e.g., _Rest -> Slow -> Intense -> Rest_).
- **Staff Execution:** Hired **Head Trainers** execute these templates daily.
- **Intervention UI:** The player only receives "Flags" for horses that are over-fatigued or failing to meet fitness milestones.

## 3. System 2: Jockeys & The Relationship Engine

### 3.1 Affinity ("The Hand")

- **Horse Affinity:** Deep bonus gained by riding the same horse repeatedly. Buffers against simulation "noise" (bad starts, traffic).
- **Stable Affinity:** Baseline bonus for **Retainer** jockeys riding any horse from the same stable.

### 3.2 The Talent Hierarchy

- **Retainers:** High-fee, exclusive superstars.
- **Apprentices:** Homegrown talent via the **Jockey Academy**. Cheap but vulnerable to **Poaching** by rivals if the player's reputation is low.
- **Regional Agents:** Mercenary booking system for outposts, ensuring the "best local" rider for a cut of the purse.

## 4. System 3: Rivalries & The Living World

### 4.1 Personal Friction

- **Friction Value:** A numerical relationship (-100 to +100) with every NPC Owner.
- **Provocation:** Auction bidding, Gazette taunts, and race-day interference.
- **NPC Tactics:** High-friction rivals will enter "Spoilers" (rabbits) to disrupt the player's peaking horse's energy management.

### 4.2 Regional Dominance

- **Home Field Advantage:** Small boost to Focus/Grit for the stable with the highest "Regional Prestige."
- **Unseating:** Winning 3 consecutive Graded races against the local "King" to claim the region.

## 5. System 4: Specialized Infrastructure & Outposts

### 5.1 Branching Tech Trees

- **Specialization:** At Tier 2, facilities branch into **Turf Cathedral** or **Dirt Powerhouse**.
- **The Lock:** Choosing one path removes the other, forcing stable identity.

### 5.2 Grid-Based Plot Management

- **Acreage Slots:** Limited physical space on the farm (e.g., 12 slots).
- **Trade-offs:** Choosing between high-capacity stabling, high-intensity training labs, or prestige-building museums.

### 5.3 Regional Outposts

- **Logistics:** Satellite stables (Kentucky, Tokyo, Newmarket).
- **Transport Fatigue:** Significant fatigue spikes when shipping across regions, requiring "Acclimatization" periods.
- **Head Trainers:** Each outpost must have its own assigned Trainer whose stats drive the regional efficiency.

## 6. NPC Parity

- **The Golden Rule:** All NPCs operate under the same Banister model, Tech Tree branches, and Staffing limits as the player.
- **Intelligence:** NPCs will "Counter-Peak" against player horses in major Grade 1 events.

## 7. Decision Log

| Decision              | Reasoning                                                               |
| :-------------------- | :---------------------------------------------------------------------- |
| **Banister Model**    | Provides a scientific, batchable math challenge for 50+ horses.         |
| **Branching Tech**    | Prevents "God-Mode" stables and encourages regional expansion.          |
| **Jockey Retainers**  | Moves jockey choice from a per-race click to a season-long partnership. |
| **Transport Fatigue** | Makes geography a meaningful strategic constraint.                      |

## 8. Assumptions

1. Staff salaries and outpost maintenance are the primary end-game gold sinks.
2. The UI will pivot to "Squad Views" as the default management layer.
3. NPCs are proactive actors, not just static stat blocks.
