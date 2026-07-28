# Probe

## 2024-03-24 - Untested Population Genetics

**Learning:** `populationGenetics.ts` handles complex coefficient of inbreeding (COI) calculations with weighting, cache wrappers, and dampening logic for game balance, yet had no test coverage. Inbreeding algorithms with recursive tree walks (like `walkPedigree`) are notoriously bug-prone for edge cases like distant outcross generations.

**Action:** Added full test coverage for COI tiers, dampeners, modifiers, AHC logic, pattern detection, and expected mathematical decay for distant generations in COI calculation, to ensure long-running stable breeding loops don't silently regress.

## 2024-07-14 - Pari-Mutuel Pool Initialization Invariant

**Learning:** `createBettingPool` in `oddsTypes.ts` correctly creates simulated Pari-Mutuel pools for race odds. However, there is a hidden invariant mismatch during initialization: `totalSimulatedPool` is hardcoded to 10000, and individual horse bets are calculated as `10000 * winProbability`. If the provided win probabilities for a race do not sum exactly to `1.0`, the sum of `horseBets` will not equal `totalPool`. This breaks the fundamental law of pari-mutuel betting where the total pool must equal the sum of all individual bets.

**Action:** Documented this latent bug with a specific test rather than fixing it to avoid breaking gameplay math elsewhere without consultation. Always verify that calculated total pools actually equal the sum of their constituent bets in simulated economy code.

## 2025-03-08 - Testing computeWeatherInjuryMultiplier

**Learning:** `computeWeatherInjuryMultiplier` in `src/core/health/healthSystem.ts` is an untested pure function that calculates probability weight multipliers for injury risk based on weather and track conditions. Testing this isolated function provides high value as it directly affects injury severity and probability, which is a key part of the health and simulation systems.
**Action:** Always check for pure functions with branching logic, especially those involving probability weights or math, as they are high-value targets for testing.

## 2025-03-08 - Pace Tendency Classification Limits

**Learning:** `classifyTendency` in `src/core/horse/paceTendency.ts` uses `Math.max` checks (`Math.max(2, f * 0.25)` and `Math.max(5, f * 0.65)`) to bucket race positions into "front", "mid", and "off" pace. In small fields (e.g. 4 or 5 horses), the minimum threshold for "mid" (5) exceeds the field size, meaning it is mathematically impossible for a horse to be classified as "off" pace in small fields.
**Action:** Added full test coverage for `distanceBucket`, `classifyTendency`, `getHorseTendencyStats`, and `matchesTendency`. Be aware of field-size skewing classification bounds when writing pace or tactical AI simulation code.

## 2024-03-20 - Edge bounds in Reputation Calculations

**Learning:** Found an untested core behavior related to reputation calculations (`calculateRaceWinReputation`, `calculateRaceLossReputation`). These algorithms handle continuous stats (purse sizing and slump counters) mapped into capped reward logic. Found a risk area where missing bounds checks might inflate prestige infinitely.
**Action:** Always verify both bounds of conditional math logic when introducing tests for game algorithms that handle continuous stats or categorical combinations.

## 2024-07-17 - Asymmetric Reputation and Transaction Impacts in Prize Money

**Learning:** In `src/core/race/impacts/prizeMoney.ts`, the generation of transaction impacts and reputation impacts (both wins and losses) are gated inside an `if (!horse.stableId)` check. This means NPC horses generate these impacts, but player-owned horses (`horse.stableId` exists) do not generate reputation or explicit transaction logs from this core module during race resolution.

**Action:** Wrote tests to document this current behavior explicitly. When testing impacts or resolvers, always assert both the positive and negative branches of ownership checks to reveal asymmetric simulation logic.

## 2024-05-19 - Testing Dosage Profile Logic
**Learning:** Found an untested core behavior block related to dosage profile calculations (`src/core/race/dosage.ts`). Discovered that it inherently depends on `pedigreeData` which can be efficiently mocked by overriding `findHorseByName` to control generation tree structure cleanly and test boundary scenarios.
**Action:** Always seek to stub data retrieval functions instead of deeply nesting full data objects when testing calculation algorithms over structures like a pedigree tree.

## 2025-03-09 - Testing pure functions in auction engine

**Learning:** Found an untested pure function `generateBreezeSeconds` in `src/core/auction/engine.ts` which calculates the breeze time for a horse at auction using weighted stats (speed 0.6, accel 0.4). This is critical for 2YO auction valuations.
**Action:** Adding isolated unit tests for it to verify exact math, range boundaries, stat weights and RNG variance.
