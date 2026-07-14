## 2024-03-24 - Untested Population Genetics

**Learning:** `populationGenetics.ts` handles complex coefficient of inbreeding (COI) calculations with weighting, cache wrappers, and dampening logic for game balance, yet had no test coverage. Inbreeding algorithms with recursive tree walks (like `walkPedigree`) are notoriously bug-prone for edge cases like distant outcross generations.

**Action:** Added full test coverage for COI tiers, dampeners, modifiers, AHC logic, pattern detection, and expected mathematical decay for distant generations in COI calculation, to ensure long-running stable breeding loops don't silently regress.

## 2024-07-14 - Pari-Mutuel Pool Initialization Invariant

**Learning:** `createBettingPool` in `oddsTypes.ts` correctly creates simulated Pari-Mutuel pools for race odds. However, there is a hidden invariant mismatch during initialization: `totalSimulatedPool` is hardcoded to 10000, and individual horse bets are calculated as `10000 * winProbability`. If the provided win probabilities for a race do not sum exactly to `1.0`, the sum of `horseBets` will not equal `totalPool`. This breaks the fundamental law of pari-mutuel betting where the total pool must equal the sum of all individual bets.

**Action:** Documented this latent bug with a specific test rather than fixing it to avoid breaking gameplay math elsewhere without consultation. Always verify that calculated total pools actually equal the sum of their constituent bets in simulated economy code.
