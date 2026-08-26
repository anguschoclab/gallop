## 2024-05-24 - Award ceremony invitation qualifiers
**Learning:** The awards system gates ceremonies based on top-3 G1 finishes in a given region per year, but testing this logic required mapping dummy races correctly through `findInvitationQualifiers` to properly align ownership and track continent logic.
**Action:** When adding tests for region-based gating logic in the future, ensure mock races are supplied with valid track names linked to `CONTINENT_TO_REGION` and dummy horses have explicit player ownership types, since NPCs are implicitly skipped.
