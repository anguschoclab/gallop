## 2024-08-22 - Testing Bloodline Resolution
**Learning:** `resolveBloodline` in `populationGenetics.ts` handles complex graph traversal, name matching, and fallback to `findHorseByName`, but it had zero tests despite being crucial for applying regional line bias/genetic bonuses.
**Action:** When I see complex recursion involving fallback strategies and multiple sources of truth (in-game state vs static pedigree data), explicitly add tests to assert each path works correctly and stops when expected.
