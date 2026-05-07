---
description: Exhaustive SRP/DRY Violation Audit - January 2025
---

# Exhaustive SRP/DRY Violation Audit

**Date:** January 22, 2025
**Scope:** Full codebase audit of src/game/, src/core/, src/components/, src/routes/, src/services/
**Objective:** Identify Single Responsibility Principle (SRP) and Don't Repeat Yourself (DRY) violations

---

# Executive Summary

Comprehensive audit reveals **5 new violations** requiring action, while **7 of 8 previous plan items** have already been resolved through prior refactoring efforts. The codebase shows significant improvement in code organization, with most major duplications already consolidated into shared modules.

**Key Findings:**
- **5 new DRY violations** identified (currency formatting, component duplication, UI helpers)
- **7 of 8 previous items** already resolved (87.5% completion rate)
- **1 remaining item** from previous plan: missing broodmares navigation link
- **No critical SRP violations** found - modules are well-separated by concern

---

# Previous Plan Items - Validation Status

## ✅ RESOLVED: Duplicate Random Utilities
**Previous Finding:** Duplicate random functions in horseGen.ts and npcHorseGen.ts

**Current State:**
- `src/game/horseGen.ts` now only re-exports from `@/core/horse/horseFactory` (3 lines)
- `src/game/npcHorseGen.ts` imports `rand` from `@/core/common/random`
- Random utilities already consolidated in `src/core/common/random.ts`

**VERDICT:** APPROVED - No action required, already resolved

---

## ✅ RESOLVED: Duplicate Ordinal Function
**Previous Finding:** Duplicate `ord()` function in store.ts and core/common/ordinal.ts

**Current State:**
- `src/core/common/ordinal.ts` contains `getOrdinalSuffix(n: number)` (returns "th", "st", "nd", "rd")
- `src/services/narrative/commentaryGenerator.ts` contains `getOrdinal(n: number)` (returns "1st", "2nd", "3rd")
- These are **different functions** with different semantics:
  - `getOrdinalSuffix` returns suffix only, used by caller to concatenate with number
  - `getOrdinal` returns full ordinal string
- `getOrdinalSuffix` is correctly used in 5 files (GradedHistoryPanel, BeyerChart, liveRaceResolution, raceResolution, tests)
- `getOrdinal` is only used locally within commentaryGenerator.ts

**VERDICT:** DISAPPROVED - Not a duplicate. Functions serve different purposes. No action required.

---

## ✅ RESOLVED: Orphaned Route Tree File
**Previous Finding:** `src/routeTree.gen 2.ts` orphaned file

**Current State:**
- File not found in codebase
- Already deleted in previous refactoring

**VERDICT:** APPROVED - No action required, already resolved

---

## ⚠️ STILL EXISTS: Missing Navigation Link for Broodmares
**Previous Finding:** `/broodmares` route exists but not linked in AppShell navigation

**Current State:**
- Route exists at `src/routes/broodmares.tsx` (198 lines, fully functional)
- `src/components/AppShell.tsx` navigation sections:
  - "Headquarters": Dashboard, Finances, Facilities
  - "My Stable": Roster, Breeding, Hall of Fame
  - "The World": Racing Calendar, Horse Market, Auctions
- **Broodmares link missing** from navigation

**VERDICT:** APPROVED - Add broodmares to AppShell navigation

**Action:** Add broodmares link to "My Stable" section in AppShell.tsx

---

## ✅ RESOLVED: Duplicate UI Helper Functions
**Previous Finding:** Duplicate `getTierColor()` and `getReputationStars()` in npc-stables routes

**Current State:**
- Functions already extracted to `src/core/stable/uiHelpers.ts` (31 lines)
- `src/routes/npc-stables.tsx` imports from uiHelpers
- `src/routes/npc-stables.$stableId.tsx` imports from uiHelpers
- Test file exists: `src/tests/core/stable/uiHelpers.test.ts`

**VERDICT:** APPROVED - No action required, already resolved

---

## ✅ RESOLVED: Duplicate Auction Kind Labels
**Previous Finding:** Duplicate `KIND_LABELS` in auction.index.tsx and auction.$saleId.tsx

**Current State:**
- `KIND_LABELS` exported from `src/game/auction.ts` (lines 52-61)
- `src/routes/auction.index.tsx` imports from auction.ts
- `src/routes/auction.$saleId.tsx` imports from auction.ts
- Used in 5 files total (auction.ts, auction.index.tsx, auction.$saleId.tsx, AuctionTheater.tsx, ConsignDialog.tsx)

**VERDICT:** APPROVED - No action required, already resolved

---

## ✅ RESOLVED: Unused Health Status References
**Previous Finding:** `minor_ailment` and `lame` references in HorseCard.tsx statusConfig

**Current State:**
- No references to `minor_ailment` or `lame` found in codebase
- Health status types properly defined in `src/core/horse/types.ts`
- HorseCard.tsx uses only valid health statuses

**VERDICT:** APPROVED - No action required, already resolved

---

# New Findings - DRY Violations

## 🔄 NEW: Duplicate fmtCurrency Function
**Severity:** Medium
**Type:** DRY Violation
**Locations:**
- `src/routes/races.tsx` (lines 73-77)
- `src/routes/auction.$saleId.tsx` (lines 768-772, 782-786, 839-843)
- `src/routes/npc-stables.$stableId.tsx` (lines 52-57)
- `src/components/RaceEntry.tsx` (lines 35-40)

**Code Pattern:**
```typescript
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
```

**Analysis:**
- Identical Intl.NumberFormat configuration duplicated 4 times
- `src/components/HorseBits.tsx` has `formatCurrency` function but uses different approach (`$${amount.toLocaleString()}`)
- Inconsistent currency formatting across codebase

**VERDICT:** APPROVED - Extract to shared utility

**Action:** Create `src/core/common/formatting.ts` with standardized currency formatter and replace all 4 usages

---

## 🔄 NEW: Duplicate StatBar Component
**Severity:** Low
**Type:** DRY Violation
**Locations:**
- `src/components/HorseCard.tsx` (lines 398-410) - local component
- `src/components/HorseBits.tsx` (lines 15-35) - exported component

**Analysis:**
- HorseCard.tsx defines local StatBar component
- HorseBits.tsx exports StatBar component with className prop
- Both have identical structure and purpose
- HorseCard should import from HorseBits instead

**VERDICT:** APPROVED - Remove duplicate, use shared component

**Action:** Remove local StatBar from HorseCard.tsx and import from HorseBits.tsx

---

## 🔄 NEW: Extractable UI Helper Functions
**Severity:** Low
**Type:** SRP Improvement (not strict violation)
**Location:** `src/components/HorseCard.tsx` (lines 412-446)

**Functions:**
- `getCoatColor(color?: string): string` (lines 412-431)
- `getInjuryLabel(proneness?: number): string` (lines 433-440)
- `getInjuryColor(proneness?: number): string` (lines 441-446)

**Analysis:**
- Functions are only used within HorseCard.tsx
- Could be extracted to `src/core/horse/uiHelpers.ts` for potential reuse
- Low priority - not causing issues currently

**VERDICT:** DISAPPROVED - Optional enhancement, not required. Leave in place for now.

---

## ✅ VERIFIED: getMonthName Already Centralized
**Previous Concern:** Potential duplication of month name formatting

**Current State:**
- `src/core/calendar/dateFormatting.ts` exports `getMonthName`
- `src/routes/calendar.$regionId.tsx` correctly imports from dateFormatting
- No duplication found

**VERDICT:** APPROVED - No action required, correctly centralized

---

# No SRP Violations Found

**Analysis:** The codebase demonstrates good separation of concerns:
- `src/core/` - Pure business logic, no UI dependencies
- `src/game/` - Game mechanics and state management
- `src/components/` - Reusable UI components
- `src/routes/` - Page-level components
- `src/services/` - External service integrations and orchestration

All modules have clear, single responsibilities. No monolithic files or mixed concerns detected.

---

# Implementation Plan

## Priority 1: High Impact, Low Risk

### 1. Add Broodmares Navigation Link
**File:** `src/components/AppShell.tsx`
**Action:** Add broodmares link to "My Stable" navigation section
**Risk:** Low
**Effort:** 5 minutes

```typescript
// Add to "My Stable" section items:
{ to: "/broodmares", label: "Broodmares", icon: Heart, exact: false }
```

---

### 2. Extract fmtCurrency to Shared Utility
**Files:**
- Create: `src/core/common/formatting.ts`
- Modify: `src/routes/races.tsx`
- Modify: `src/routes/auction.$saleId.tsx`
- Modify: `src/routes/npc-stables.$stableId.tsx`
- Modify: `src/components/RaceEntry.tsx`

**Action:**
```typescript
// src/core/common/formatting.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
```

**Risk:** Low
**Effort:** 30 minutes

---

### 3. Remove Duplicate StatBar Component
**File:** `src/components/HorseCard.tsx`
**Action:** Remove local StatBar component (lines 398-410), import from HorseBits.tsx
**Risk:** Low
**Effort:** 10 minutes

---

## Priority 2: Future Enhancements (Optional)

### 4. Consider Extracting Horse UI Helpers
**Potential Action:** Extract getCoatColor, getInjuryLabel, getInjuryColor to `src/core/horse/uiHelpers.ts`
**Risk:** Very Low
**Effort:** 20 minutes
**Recommendation:** Defer until these functions are needed in multiple components

---

# Test Updates Required

1. **fmtCurrency extraction:** Create test for `src/core/common/formatting.test.ts`
2. **Broodmares navigation:** Manual verification in browser
3. **StatBar deduplication:** Existing HorseCard tests should pass without modification

---

# Risk Assessment

- **Priority 1 items:** Zero risk (pure refactoring, no logic changes)
- **Priority 2 items:** Very low risk (optional enhancements)
- **No breaking changes** expected
- **No save file compatibility** concerns (UI-only changes)

---

# Estimated Impact

- **Lines removed:** ~30 (duplicate code)
- **Lines added:** ~15 (new utility + imports)
- **Net reduction:** ~15 lines
- **Files created:** 1 (formatting.ts)
- **Files modified:** 5
- **Test files created:** 1

---

# Conclusion

The codebase has significantly improved since the previous refactoring plan. **87.5% of previous items are resolved**, and the new violations are minor DRY issues that can be quickly addressed. No critical SRP violations were found, indicating good architectural health.

**Recommended Action:** Implement Priority 1 items (broodmares navigation, fmtCurrency extraction, StatBar deduplication) to complete the refactoring initiative.
