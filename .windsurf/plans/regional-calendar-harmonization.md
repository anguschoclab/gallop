# Regional Calendar Harmonization - Implementation Plan

## Executive Summary

Exhaustive codebase audit reveals significant duplication (5 calendar routes ~85% identical), 9 missing regional routes despite having race data, 3 orphaned schedule components, and fragmented filtering logic. **APPROVED** for consolidation into parameterized `/calendar/$regionId` route.

---

## Complete File Inventory

### Existing Calendar/Schedule Routes (8 files)

| File | Lines | Pattern | Filters | Status |
|------|-------|---------|---------|--------|
| `canadian-calendar.tsx` | 214 | Month-based | Grade + Triple Crown | **DUPLICATE** |
| `german-calendar.tsx` | 196 | Month-based | Grade + Track | **DUPLICATE** |
| `scandinavian-calendar.tsx` | 190 | Month-based | Grade + Track | **DUPLICATE** |
| `south-american-calendar.tsx` | 171 | Month-based | Grade only | **DUPLICATE** |
| `uae-calendar.tsx` | 168 | Month-based | Grade only | **DUPLICATE** |
| `track-schedule.tsx` | 205 | **Track-based** | Grade + Triple Crown | **Canadian-only** |
| `scheduler.tsx` | 314 | Campaign planner | Horse-specific | **Different purpose** |
| `races.tsx` | 500 | Global calendar | All filters | **Master reference** |

**Total Lines of Duplicated UI Logic: ~1,150 lines**

### Orphaned Schedule Components (3 files - NOT IMPORTED ANYWHERE)

| File | Lines | Features | Status |
|------|-------|----------|--------|
| `RegionalSchedule.tsx` | 216 | Continent/country/track filters, track tabs | **UNUSED** |
| `CanadianSchedule.tsx` | 130 | Canadian track tabs | **UNUSED** |
| `JapaneseSchedule.tsx` | 142 | Season filter (early/mid/late) | **UNUSED** |

**Verified via grep search - no imports found in codebase.**

### Missing Regional Routes (9 regions with data but NO UI)

| Region | Tracks | Example G1s | Data Status | Route Status |
|--------|--------|-------------|-------------|--------------|
| **USA** | 15 tracks | Kentucky Derby, Preakness, Belmont | ✅ `gradedRaces.ts:1112` | ❌ **MISSING** |
| UK | 11 tracks | 2000 Guineas, Derby, St Leger | ✅ `gradedRaces.ts` | ❌ **MISSING** |
| Ireland | 4 tracks | Irish Derby | ✅ `gradedRaces.ts` | ❌ **MISSING** |
| France | 6 tracks | Prix de l'Arc de Triomphe | ✅ `gradedRaces.ts` | ❌ **MISSING** |
| Japan | 17 tracks | Japan Cup, Tokyo Yushun | ✅ `gradedRaces.ts` | ❌ **MISSING** |
| Hong Kong | 2 tracks | Hong Kong Derby | ✅ `gradedRaces.ts` | ❌ **MISSING** |
| Australia | 7 tracks | Melbourne Cup | ✅ `gradedRaces.ts` | ❌ **MISSING** |
| Italy | 2 tracks | Derby Italiano | ✅ `gradedRaces.ts` | ❌ **MISSING** |
| Spain | 3 tracks | | ✅ `gradedRaces.ts` | ❌ **MISSING** |

### Core Files Involved

| File | Purpose | Relevance |
|------|---------|-----------|
| `tracks.ts:91-494` | TRACK_SCHEDULES array - master track config | **CRITICAL** - has all tracks with regionalSystem |
| `gradedRaces.ts:1110-1115` | USA Triple Crown races with triplecrownKey | **CRITICAL** - usa-tc key exists |
| `raceSchedule.ts:120-149` | generateAnnualCalendar - uses GRADED_RACES | Calendar generation |
| `dateFormatting.ts:42-49` | getMonthName - month grouping | Shared utility |
| `raceFilterService.ts:63-86` | getRacesByMonth - grouping logic | **APPROVED** pattern to follow |
| `filtering.ts:40-50` | Triple Crown filter - HARDCODED CANADA ONLY | **MUST FIX** |

---

## Findings - APPROVED ✅

### 1. Code Duplication - APPROVED for Consolidation

All 5 regional calendars share identical patterns:
- Lines 28-44: Filter state management (identical)
- Lines 47-54: Month grouping logic (identical)
- Lines 64-133: Filter UI buttons (identical structure)
- Lines 137-201: Race card rendering (identical)

**Only differences:**
- Track Set definitions (lines 11-21)
- Title/subtitle text (lines 56-57)
- Special filters (Canadian has Triple Crown, German has track filter)

### 2. Missing Regional Routes - APPROVED for Creation

USA Triple Crown races EXIST in data but have NO route:
```ts
// gradedRaces.ts:1112-1115
{ key: "usa-kentucky-derby", name: "Kentucky Derby", triplecrownKey: "usa-tc" },
{ key: "usa-preakness", name: "Preakness Stakes", triplecrownKey: "usa-tc" },
{ key: "usa-belmont-stakes", name: "Belmont Stakes", triplecrownKey: "usa-tc" },
```

### 3. Orphaned Components - APPROVED for Deletion/Repurpose

`RegionalSchedule.tsx` already implements the generic pattern we need but is unused. Can be:
- Deleted (replaced by new route)
- OR repurposed as "Today's Race Card" widget

### 4. Inconsistent Filtering - APPROVED for Unification

Current state:
- `filtering.ts:42-46` - Hardcoded Canadian Triple Crown keys only
- `canadian-calendar.tsx:11-15` - Duplicate Triple Crown key definition
- `track-schedule.tsx:10-14` - Third duplicate of same keys

Needed: Configurable special race keys per region.

### 5. Track-Based View Pattern - APPROVED for Generalization

`track-schedule.tsx` provides track-grouped view but is Canadian-only. This should be a view mode toggle on all regional calendars.

### 6. Navigation Gap - APPROVED for Addition

`AppShell.tsx:13-25` - Navigation items have no regional calendar links. Users must know URLs exist.

---

## Findings - DISPROVED/REVISED ❌

### 1. `core/calendar/regions.ts` - REVISED

**Status:** Already created during planning phase, but needs updates:
- German tracks mismatch: `regions.ts` has Düsseldorf, Hamburg, Dortmund
- `tracks.ts` has Munich, Cologne, Hoppegarten, Baden-Baden, Düsseldorf, Hanover, Krefeld
- **Action:** Update to match tracks.ts exactly

### 2. `filtering.ts` Triple Crown - DISPROVED as Complete

Current implementation only handles Canadian Triple Crown. **Must extend** to support:
- USA Triple Crown (usa-tc key)
- UK Classics (uk-tc key)
- Any region-defined special race sets

---

## Implementation Strategy

### Option Selected: Consolidated Parameterized Route ✅

**Decision:** Create `/calendar/$regionId` with config-driven regions.

**Rationale:**
- 85% code duplication = extract config, not just components
- Easy to add 9 missing regions without 9 new files
- Supports both Month and Track view modes as toggles
- URL pattern follows REST convention

### Files to Create/Modify

#### NEW Files (3)
| File | Purpose | Lines Est. |
|------|---------|------------|
| `routes/calendar.$regionId.tsx` | Parameterized calendar route | ~400 |
| `core/calendar/regions.ts` | Region configuration (UPDATE existing) | ~200 |
| `components/RegionSwitcher.tsx` | Region navigation component | ~80 |

#### DELETE Files (8) - Post-Implementation
| File | Reason |
|------|--------|
| `canadian-calendar.tsx` | Replaced by /calendar/canada |
| `german-calendar.tsx` | Replaced by /calendar/germany |
| `scandinavian-calendar.tsx` | Replaced by /calendar/scandinavia |
| `south-american-calendar.tsx` | Replaced by /calendar/south-america |
| `uae-calendar.tsx` | Replaced by /calendar/uae |
| `track-schedule.tsx` | View mode in new route |
| `RegionalSchedule.tsx` | Superseded by route |
| `CanadianSchedule.tsx` | Superseded by route |
| `JapaneseSchedule.tsx` | Season filter merged into route |

#### UPDATE Files (4)
| File | Changes |
|------|---------|
| `AppShell.tsx` | Add regional calendar navigation |
| `filtering.ts` | Make Triple Crown filter generic |
| `routeTree.gen.ts` | Auto-generated by TanStack |
| `router.tsx` | No changes (uses routeTree) |

---

## Technical Specification

### URL Structure

```
/calendar                  → Index with region grid
/calendar/canada           → Canadian calendar (month view default)
/calendar/canada?view=track → Canadian calendar (track view)
/calendar/usa?grade=G1&special=only → USA G1 Triple Crown races only
/calendar/japan?view=month → Japanese calendar
```

### RegionConfig Interface

```ts
interface RegionConfig {
  id: RegionId;
  name: string;
  title: string;
  subtitle: string;
  tracks: string[];              // From tracks.ts
  trackIds: string[];            // UUIDs from tracks.ts
  specialRaceKeys?: Set<string>; // Triple Crown, Classics, etc.
  specialFilterName?: string;    // "Triple Crown", "Classics"
  continent: Continent;
  hasSeasonFilter?: boolean;     // Japan-style seasonal filtering
}
```

### View Modes

1. **Month View** (default): Groups races by month, chronological within month
2. **Track View**: Groups races by track, tabs or cards per track
3. **List View**: Flat list with all filters (like current /races)

### Filters (All Regions)

- Grade: All, G1, G2, G3
- Track: All, or specific track from region
- Special: All, Only, Exclude (for Triple Crown/Classics if region has them)
- View: Month, Track (toggle)

### Special Regional Features

| Region | Special Feature | Implementation |
|--------|-----------------|----------------|
| Canada | Triple Crown | Triple Crown filter |
| USA | Triple Crown | Triple Crown filter |
| UK | Classics | "Classics" filter |
| Japan | Seasons | Season tabs (if hasSeasonFilter=true) |
| All | Track meet | Track view mode |

---

## Migration Plan

### Phase 1: Create New Route (Safe)
1. Create `calendar.$regionId.tsx` with full functionality
2. Update `regions.ts` to match tracks.ts exactly
3. Test new routes manually

### Phase 2: Navigation (Safe)
1. Add region links to AppShell.tsx
2. Create region index page at `/calendar`

### Phase 3: Filtering Update (Low Risk)
1. Update `filtering.ts` to accept configurable special keys
2. Verify Triple Crown filters work for all regions

### Phase 4: Delete Old Routes (Destructive)
1. Remove 5 regional calendar routes
2. Remove track-schedule.tsx
3. Remove 3 orphaned schedule components
4. Update any hardcoded links (check for internal references)

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Broken bookmarks to old routes | Medium | Add redirects from old routes to new |
| Filter state loss | Low | URL search params persist |
| User confusion | Low | Better navigation + consistent UI |
| Data mismatch (tracks) | Low | Source of truth is tracks.ts |
| Build errors | Low | TanStack Router auto-generates types |

---

## Testing Checklist

- [ ] All 14 regions load without errors
- [ ] Month view groups correctly by month
- [ ] Track view groups correctly by track
- [ ] Grade filter works (G1, G2, G3)
- [ ] Special filters work (Triple Crown, Classics)
- [ ] Track filter works (all tracks in region)
- [ ] Japan season filter renders (if applicable)
- [ ] Region switcher navigates correctly
- [ ] URL params persist and share correctly
- [ ] Mobile responsive

---

## Post-Implementation Metrics

| Metric | Before | After |
|--------|--------|-------|
| Regional route files | 5 | 1 |
| Orphaned components | 3 | 0 |
| Regions accessible | 5 | 14 |
| Lines of calendar UI code | ~1,150 | ~400 |
| Duplication percentage | ~85% | ~10% |

---

## Decision: APPROVED ✅

**Full implementation APPROVED** with the following conditions:
1. Update `regions.ts` to match `tracks.ts` track lists exactly
2. Make `filtering.ts` Triple Crown logic generic/configurable
3. Add redirects from old routes to new parameterized routes
4. Keep `scheduler.tsx` (different purpose - campaign planning)
5. Add season filter support for Japan in new route

**Implementation priority:** P1 (High) - Significant duplication reduction and missing feature coverage.
