# Audit 01 — Type Safety

**Generated:** 2026-09-03
**Method:** `grep -rn ": any\|as any" src --include="*.ts" --include="*.tsx" | grep -v /tests/ | grep -v /test-utils/`

## Summary

- **Total `any` occurrences in non-test src:** 69 across 6 files
- **Auto-generated (exempt):** 1 file (`routeTree.gen.ts` — `@ts-nocheck`)
- **Comment-only (no code change):** 1 file (`useGameSelector.ts`)
- **Files requiring code changes:** 4

## Files requiring changes

### 1. `src/game/store/slices/privateSaleSlice.ts`

| Line | Cast | Fix |
| ------ | ------ | ----- |
| 152 | `(s as any).reputation?.score ?? 0` | **Remove `as any`** — `reputation?: ManagerReputation` is already on `SystemsState` (line 132), which is part of `StoreType`. `StoreGet = () => StoreType`. The cast is redundant. |
| 180 | `(s as any).npcAIManager?.stableStates?.[stableId]?.friction ?? 0` | **Remove `as any`** — `npcAIManager?: NpcAIManager` is already on `SystemsState` (line 66). `NpcAIManager.stableStates: Record<string, StableAIState>` (npcCycleAI.ts:154). |
| 181 | `(s as any).reputation?.score ?? 0` | **Remove `as any`** — same as line 152. |

**Existing tests:** `tests/store/slices/privateSaleSlice.test.ts`, `privateSaleOverrideSlice.test.ts` + 8 related

### 2. `src/components/analytics/RivalIntelTab.tsx`

| Line | Cast | Fix |
| ------ | ------ | ----- |
| 296 | `Record<string, any>` (param type for `stableStates`) | Replace with `Record<string, StableAIState>` — import from `@/core/ai/npcCycleAI` |
| 299 | `(d: any) => ({ stableId: id, ...d })` | Replace with `(d: StrategicDirective)` — `StrategicDirective` imported in `npcCycleAI.ts:35`, `strategicDirectives?: StrategicDirective[]` at line 76 |

**Existing tests:** `tests/components/analytics/RivalIntelTab.test.tsx`

### 3. `src/constants/inboxConstants.ts` + `src/hooks/inbox/useInbox.ts`

| File | Line | Cast | Fix |
| ------ | ------ | ------ | ----- |
| `inboxConstants.ts` | 6 | `ACTION_FILTER_EXCLUDED_PRIORITIES = ["info", "low"] as const` | Change type to `readonly InboxPriority[]` — `InboxPriority = "info"\|"low"\|"action"\|"urgent"\|"critical"` (inboxTypes.ts:22) |
| `useInbox.ts` | 38 | `m.priority as any` | **Remove `as any`** — once the constant is typed as `readonly InboxPriority[]`, `.includes(m.priority)` works without cast |

**Existing tests:** `tests/hooks/useInbox.test.tsx`, `tests/core/inboxActions.test.ts` + 7 related

### 4. `src/services/narrative/raceContextBuilder.ts`

| Line | Cast | Fix |
| ------ | ------ | ----- |
| 60 | `(entry: any) => entry.raceName === raceName \|\| entry.raceId === race?.id` | Replace with `(entry: HorseRaceHistoryEntry)` — `horse.raceHistory: HorseRaceHistoryEntry[]` (horse/types.ts:186), type at horse/types.ts:116 |

**Existing tests:** `tests/services/raceContextCommentary.test.ts`

## Exempt files (no action)

- `src/routeTree.gen.ts` — auto-generated, `@ts-nocheck` on line 3
- `src/hooks/shared/useGameSelector.ts` — `any` appears only in a comment (line 6: "Replaces `(useGame as any)` casts")
