## 2024-05-24 - Typed Staff Config Labels
**Learning:** `STAFF_TIER_LABELS` and `STAFF_ROLE_LABELS` in `src/domains/staff/simulation/staffConfig.ts` were properly typed as `Record<StaffTier, string>` and `Record<StaffRole, string>`, but they were being type-casted via `as Record<string, string>` in UI components. This undermined the strict typings that should guarantee all valid roles/tiers have labels.
**Action:** Removed the `as Record<string, string>` casts in `RecruitmentPool.tsx` and `StaffTeamList.tsx` so the compiler inherently trusts and enforces the type contract from the config.
