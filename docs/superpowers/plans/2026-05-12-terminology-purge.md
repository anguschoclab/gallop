# Terminology Purge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all military/tech-register copy (Asset, Deployment, Intel, Mission, System Day, Target) with correct horse-racing terminology across 17 files, and codify the rule in the design bible.

**Architecture:** Pure copy substitution — no logic, no data model, no API changes. Each task is a batch of related files. All tasks are independent and can run in parallel.

**Tech Stack:** React/TSX, string edits only. Prettier auto-formats on save via PostToolUse hook — no manual format step needed.

**Spec:** `docs/superpowers/specs/2026-05-12-terminology-purge-design.md`

---

### Task 1: Dashboard route (`src/routes/index.tsx`)

**Files:**

- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Read the file to confirm exact strings**

```bash
grep -n "Manage Assets\|Upcoming Targets\|Intelligence Feed\|Intelligence Brief" src/routes/index.tsx
```

- [ ] **Step 2: Apply replacements**

| Find                        | Replace             |
| --------------------------- | ------------------- |
| `Manage Assets`             | `Manage Horses`     |
| `Upcoming Targets`          | `Upcoming Races`    |
| `Intelligence Feed`         | `News Feed`         |
| `{/* Intelligence Feed */}` | `{/* News Feed */}` |

Use Edit tool for each replacement. Preserve surrounding JSX exactly.

- [ ] **Step 3: Verify**

```bash
grep -n "Manage Assets\|Upcoming Targets\|Intelligence Feed\|Intelligence Brief" src/routes/index.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/routes/index.tsx
git commit -m "copy: remove military jargon from dashboard route"
```

---

### Task 2: Stable index route (`src/routes/stable.index.tsx`)

**Files:**

- Modify: `src/routes/stable.index.tsx`

- [ ] **Step 1: Read to confirm exact strings**

```bash
grep -n "Registry of Assets\|Identified Asset\|Mission Plan\|No Intelligence Data" src/routes/stable.index.tsx
```

- [ ] **Step 2: Apply replacements**

| Find                             | Replace             |
| -------------------------------- | ------------------- |
| `Registry of Assets`             | `Horse Registry`    |
| `Identified Asset`               | `Horse`             |
| `Mission Plan`                   | `Race Plan`         |
| `No Intelligence Data Available` | `No data available` |

- [ ] **Step 3: Verify**

```bash
grep -n "Registry of Assets\|Identified Asset\|Mission Plan\|No Intelligence Data" src/routes/stable.index.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/routes/stable.index.tsx
git commit -m "copy: remove military jargon from stable index route"
```

---

### Task 3: Horse detail route (`src/routes/stable.$horseId.tsx`)

**Files:**

- Modify: `src/routes/stable.$horseId.tsx`

- [ ] **Step 1: Read to confirm exact strings**

```bash
grep -n "Asset Inventory\|Deployment & Disposition\|Deployment Ready\|Stable Deployment\|Consign Asset" src/routes/stable.\$horseId.tsx
```

- [ ] **Step 2: Apply replacements**

| Find                       | Replace             |
| -------------------------- | ------------------- |
| `Asset Inventory`          | `Equipment`         |
| `Deployment & Disposition` | `Racing & Status`   |
| `Deployment Ready`         | `Available to Race` |
| `Stable Deployment`        | `Staying in Stable` |
| `Consign Asset`            | `Consign`           |

- [ ] **Step 3: Verify**

```bash
grep -n "Asset Inventory\|Deployment & Disposition\|Deployment Ready\|Stable Deployment\|Consign Asset" src/routes/stable.\$horseId.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "src/routes/stable.\$horseId.tsx"
git commit -m "copy: remove military jargon from horse detail route"
```

---

### Task 4: Auction index route (`src/routes/auction.index.tsx`)

**Files:**

- Modify: `src/routes/auction.index.tsx`

- [ ] **Step 1: Read to confirm exact strings**

```bash
grep -n "Public Asset Exchange\|Deployment Dock\|Eligible Assets\|Assets Catalogued\|Asset Class\|Deployment" src/routes/auction.index.tsx
```

- [ ] **Step 2: Apply replacements**

| Find                                                         | Replace           |
| ------------------------------------------------------------ | ----------------- |
| `Public Asset Exchange`                                      | `Public Sales`    |
| `Deployment Dock`                                            | `Consign to Sale` |
| `Eligible Assets`                                            | `Eligible Horses` |
| `Assets Catalogued`                                          | `Lots Listed`     |
| `Asset Class`                                                | `Category`        |
| `Deployment` (table column header only — not variable names) | `Enter`           |

**Important:** Only replace the user-visible label `Deployment` in the `<th>` element, not variable names like `consignTarget`.

- [ ] **Step 3: Verify**

```bash
grep -n "Public Asset Exchange\|Deployment Dock\|Eligible Assets\|Assets Catalogued\|Asset Class" src/routes/auction.index.tsx
# Also verify no variable names were touched:
grep -n "consignTarget\|setConsign" src/routes/auction.index.tsx
```

Expected: first grep no output; second grep shows variable names intact.

- [ ] **Step 4: Commit**

```bash
git add src/routes/auction.index.tsx
git commit -m "copy: remove military jargon from auction index route"
```

---

### Task 5: Auction sale route (`src/routes/auction.$saleId.tsx`)

**Files:**

- Modify: `src/routes/auction.$saleId.tsx`

- [ ] **Step 1: Read to confirm exact strings**

```bash
grep -n "System Day\|No Catalog Data\|Asset_Verified\|Scouting_Intel\|Asset Sync\|Assets Sold\|horseName.*Asset" src/routes/auction.\$saleId.tsx
```

- [ ] **Step 2: Apply replacements**

| Find                                 | Replace                              |
| ------------------------------------ | ------------------------------------ |
| `System Day:`                        | `Season Day:`                        |
| `No Catalog Data Detected`           | `No Lots Listed Yet`                 |
| `Asset_Verified`                     | `Confirmed`                          |
| `Scouting_Intel_Readout`             | `Scouting Report`                    |
| `horseName={horse?.name ?? "Asset"}` | `horseName={horse?.name ?? "Horse"}` |
| `Asset Sync Failure`                 | `Data Unavailable`                   |
| `Assets Sold`                        | `Lots Sold`                          |
| `{/* Scouting Intel */}`             | `{/* Scouting Report */}`            |

- [ ] **Step 3: Verify**

```bash
grep -n "System Day\|No Catalog Data\|Asset_Verified\|Scouting_Intel\|Asset Sync\|Assets Sold" src/routes/auction.\$saleId.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "src/routes/auction.\$saleId.tsx"
git commit -m "copy: remove military jargon from auction sale route"
```

---

### Task 6: Market and staff routes

**Files:**

- Modify: `src/routes/market.tsx`
- Modify: `src/routes/staff.tsx`

- [ ] **Step 1: Read to confirm**

```bash
grep -n "Asset Procurement Division" src/routes/market.tsx
grep -n "System Day" src/routes/staff.tsx
```

- [ ] **Step 2: Apply replacements**

In `market.tsx`:
| Find | Replace |
|---|---|
| `Asset Procurement Division` | `Horse Market` |

In `staff.tsx`:
| Find | Replace |
|---|---|
| `System Day:` | `Season Day:` |

- [ ] **Step 3: Verify**

```bash
grep -n "Asset Procurement\|System Day" src/routes/market.tsx src/routes/staff.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/routes/market.tsx src/routes/staff.tsx
git commit -m "copy: remove military jargon from market and staff routes"
```

---

### Task 7: NPC stables route (`src/routes/npc-stables.$stableId.tsx`)

**Files:**

- Modify: `src/routes/npc-stables.$stableId.tsx`

- [ ] **Step 1: Read to confirm**

```bash
grep -n "Assets\|Zero Assets\|Liquid Assets\|Asset Roster" "src/routes/npc-stables.\$stableId.tsx"
```

- [ ] **Step 2: Apply replacements**

| Find                                                  | Replace        |
| ----------------------------------------------------- | -------------- |
| `Assets: ` (stat label, e.g. `Assets: <NumericValue`) | `Horses: `     |
| `Total Assets`                                        | `Total Horses` |
| `Zero Assets Detected`                                | `No Horses`    |
| `Liquid Assets`                                       | `Cash on Hand` |
| `Asset Roster`                                        | `Horse Roster` |

**Important:** Only replace user-visible string literals. Do not touch variable names.

- [ ] **Step 3: Verify**

```bash
grep -n "Assets\|Zero Assets\|Liquid Assets\|Asset Roster" "src/routes/npc-stables.\$stableId.tsx" | grep -v "//\|stableHorses\|variable"
```

Expected: no user-visible jargon remaining.

- [ ] **Step 4: Commit**

```bash
git add "src/routes/npc-stables.\$stableId.tsx"
git commit -m "copy: remove military jargon from NPC stables route"
```

---

### Task 8: Component fixes (labels and headers)

**Files:**

- Modify: `src/components/GradedStatsChart.tsx`
- Modify: `src/components/JockeyRoster.tsx`
- Modify: `src/components/FinancialReport.tsx`
- Modify: `src/components/HorseCard.tsx`
- Modify: `src/components/SaveLoadDialog.tsx`
- Modify: `src/components/race/ResultOverlay.tsx`
- Modify: `src/components/narrative/Gazette.tsx`

- [ ] **Step 1: Read to confirm exact strings**

```bash
grep -n "Deployment_Performance_Matrix\|Reset Intel\|Liquid_Assets\|Asset Dossier\|Asset / Rider\|Intelligence Brief" \
  src/components/GradedStatsChart.tsx \
  src/components/JockeyRoster.tsx \
  src/components/FinancialReport.tsx \
  src/components/HorseCard.tsx \
  src/components/race/ResultOverlay.tsx \
  src/components/narrative/Gazette.tsx
grep -n "Assets" src/components/SaveLoadDialog.tsx
```

- [ ] **Step 2: Apply replacements per file**

`GradedStatsChart.tsx`:
| Find | Replace |
|---|---|
| `Deployment_Performance_Matrix` | `Graded Race Record` |

`JockeyRoster.tsx`:
| Find | Replace |
|---|---|
| `Reset Intel Filters` | `Reset Filters` |

`FinancialReport.tsx`:
| Find | Replace |
|---|---|
| `Liquid_Assets` | `Cash on Hand` |

`HorseCard.tsx`:
| Find | Replace |
|---|---|
| `Asset Dossier` | `Horse Profile` |

`SaveLoadDialog.tsx`:
| Find | Replace |
|---|---|
| `Assets` (the user-visible label in the save/load stats section) | `Horses` |

`ResultOverlay.tsx`:
| Find | Replace |
|---|---|
| `Asset / Rider` | `Horse / Jockey` |

`Gazette.tsx`:
| Find | Replace |
|---|---|
| `Intelligence Brief` | `Latest News` |

- [ ] **Step 3: Verify**

```bash
grep -rn "Deployment_Performance\|Reset Intel\|Liquid_Assets\|Asset Dossier\|Asset / Rider\|Intelligence Brief" \
  src/components/GradedStatsChart.tsx \
  src/components/JockeyRoster.tsx \
  src/components/FinancialReport.tsx \
  src/components/HorseCard.tsx \
  src/components/race/ResultOverlay.tsx \
  src/components/narrative/Gazette.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add \
  src/components/GradedStatsChart.tsx \
  src/components/JockeyRoster.tsx \
  src/components/FinancialReport.tsx \
  src/components/HorseCard.tsx \
  src/components/SaveLoadDialog.tsx \
  src/components/race/ResultOverlay.tsx \
  src/components/narrative/Gazette.tsx
git commit -m "copy: remove military jargon from components"
```

---

### Task 9: Design bible — anti-patterns doc

**Files:**

- Create: `docs/design-bible/02-voice/03-anti-patterns.md`

- [ ] **Step 1: Create the file**

Write `docs/design-bible/02-voice/03-anti-patterns.md` with this exact content:

```markdown
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
```

- [ ] **Step 2: Verify the file was created**

```bash
cat docs/design-bible/02-voice/03-anti-patterns.md | head -5
```

Expected: frontmatter header visible.

- [ ] **Step 3: Commit**

```bash
git add docs/design-bible/02-voice/03-anti-patterns.md docs/superpowers/specs/2026-05-12-terminology-purge-design.md
git commit -m "docs: add copy anti-patterns to design bible, add terminology purge spec"
```

---

### Task 10: Final verification sweep

- [ ] **Step 1: Run the full jargon scan**

```bash
grep -rn --include="*.tsx" --include="*.ts" \
  -E "(Deployment|Mission Plan|Intelligence Feed|Intelligence Brief|Scouting_Intel|Asset Dossier|Asset Inventory|Asset Roster|Asset Sync|Asset_Verified|Public Asset Exchange|Deployment Dock|Deployment_Performance|Liquid_Assets|Liquid Assets|Reset Intel|System Day|Zero Assets Detected|No Intelligence Data|No Catalog Data|ENTER_ASSET|DEPLOYED|Asset / Rider|Assets Catalogued|Asset Class|Eligible Assets|Total Assets|Assets Sold|Asset Procurement|Upcoming Targets|Manage Assets|Registry of Assets|Identified Asset)" \
  src/routes/ src/components/ \
  | grep -v "node_modules" | grep -v ".bak"
```

Expected: no output (or only false positives in comments/variable names).

- [ ] **Step 2: If any hits remain, fix them and commit**

```bash
git add -p
git commit -m "copy: fix remaining jargon found in verification sweep"
```
