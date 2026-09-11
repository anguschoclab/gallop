# Audit: Failing Tests Root Cause (Subsystem K)

19 failing tests across 8 files on `main`. Root causes determined by static analysis (subagent) + my own diff investigation.

## Summary

| File | # fail | Root cause | Verdict |
|------|--------|------------|---------|
| `schedulerPhase.test.ts` | 3 | Test uses `flags: {}` (object) but type is `CampaignFlag[]` | TEST BUG |
| `HorseConditionSection.test.tsx` | 8 | TanStack `<Link>` crashes outside RouterProvider | TEST BUG (mock missing) |
| `HorseBenchmarkDialog.test.tsx` | 3 | `getByText` finds non-unique text (surface labels in table rows) | TEST BUG |
| `HorseDetail.surfacing.test.tsx` | 1 | Responsive CSS `hidden xl:block` hides "Campaign Strategy" link | TEST BUG |
| `HorseHandlerInjury.test.ts` | 2 | Handler always attaches CTA; tests expect `undefined` for minor/moderate | PRODUCTION BUG (HorseHandler.ts:204-221) |
| `raceImpactHelpers.test.ts` | 1 | Needs runtime confirmation — likely data-shape mismatch | PENDING |
| `packageManagerConfig.test.ts` | 1 | `bunfig.toml` has `[test]` section that test forbids | PRODUCTION CONFIG BUG |
| `orphanAudit.test.ts` | 1 | Brittle regex in `scripts/orphan-audit.ts` misses outpost keys | PRODUCTION BUG (scanner) |

## Detailed root causes

### 1. schedulerPhase.test.ts (3 failures) — TEST BUG
Tests use `flags: {}` (object) at l.35, l.70, l.118. Type is `CampaignFlag[]` (array). `[...campaign.flags]` at `schedulerPhase.ts:156` throws `TypeError: campaign.flags is not iterable`.
**Fix:** Change `flags: {}` to `flags: []` in all 3 test campaigns.

### 2. HorseConditionSection.test.tsx (8 failures) — TEST BUG
Component renders TanStack `<Link to="/vet">` (l.20-25). Test harness `renderWithStore` doesn't wrap in RouterProvider. All 8 tests crash during render.
**Fix:** Add `vi.mock("@tanstack/react-router", () => createRouterMock())` at top of test file, OR replace `<Link>` with `<a href="/vet">` in component.

### 3. HorseBenchmarkDialog.test.tsx (3 failures) — TEST BUG
- l.81-82: `getByText("Turf")`/`getByText("Dirt")` fail — text also appears in benchmark table rows (non-unique)
- l.128: `getByText("Black Caviar")` fails — two Turf benchmark rows for Black Caviar in `realWorldRecords.ts:146,1283`
**Fix:** Use `getByRole("button", { name: "Turf" })` for filter buttons; use `getAllByText` for duplicate names.

### 4. HorseDetail.surfacing.test.tsx (1 failure) — TEST BUG
Sidebar uses `hidden xl:block` (l.91-132). "Campaign Strategy" link (l.131) is hidden in default test viewport. `getByText(/Campaign Strategy/i)` at l.49 can't find hidden element.
**Fix:** Use `getByText(/Campaign Strategy/i, { hidden: true })` or set wide viewport.

### 5. HorseHandlerInjury.test.ts (2 failures) — PRODUCTION BUG
`HorseHandler.ts:204-221` always attaches `cta` and `secondaryCta` to injury inbox messages. Tests at l.255 and l.285 expect `cta` to be `undefined` for minor and moderate injuries.
**Fix:** Make CTA conditional on `severity === "major" || severity === "career-ending"` in HorseHandler.ts.

### 6. raceImpactHelpers.test.ts (1 failure) — PENDING
Need to run `bunx vitest run src/tests/services/raceImpactHelpers.test.ts` to get exact failure. Likely data-shape mismatch in `generateJockeyStatsTrackingImpacts` or `generateTripleCrownProgressImpact`.

### 7. packageManagerConfig.test.ts (1 failure) — PRODUCTION CONFIG BUG
`bunfig.toml:4-5` has `[test]` section with `preload = ["@happy-dom/global-registrator/register"]`. Test at l.31-34 forbids `[test]` section (`expect(bunfig).not.toMatch(/^\[test\]/m)`).
**Fix:** Remove `[test]` section from `bunfig.toml` (project uses vitest, not bun test).

### 8. orphanAudit.test.ts (1 failure) — PRODUCTION BUG
`scripts/orphan-audit.ts:246-250` uses brittle regex to extract `SLOT_FOOTPRINTS` keys from raw file text. Test expects `jockey_academy` and `museum` in `outpostFootprints`. Keys exist in `outpostTypes.ts:51-52` but regex misses them (likely due to formatting or `as Record<...>` cast changes).
**Fix:** Make `scanFacilityTypeParity` import `OUTPOST_CONSTANTS.SLOT_FOOTPRINTS` directly and use `Object.keys()` instead of regex parsing.
