## 2024-05-24 - Explicit any in time phases array mapping
**Learning:** Found an explicit `any[]` array definition in `src/core/time/phases/upkeep.ts` masking the fact that it holds `StaffMember` objects.
**Action:** Typed the map properly as `Map<string, StaffMember[]>` and imported `StaffMember`.
