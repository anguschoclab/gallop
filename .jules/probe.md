## 2024-03-24 - Untested Population Genetics

**Learning:** `populationGenetics.ts` handles complex coefficient of inbreeding (COI) calculations with weighting, cache wrappers, and dampening logic for game balance, yet had no test coverage. Inbreeding algorithms with recursive tree walks (like `walkPedigree`) are notoriously bug-prone for edge cases like distant outcross generations.

**Action:** Added full test coverage for COI tiers, dampeners, modifiers, AHC logic, pattern detection, and expected mathematical decay for distant generations in COI calculation, to ensure long-running stable breeding loops don't silently regress.
