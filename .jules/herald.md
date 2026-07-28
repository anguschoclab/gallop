# Herald

## 2026-07-05 - Rivalry News Variety Gap

**Learning:** The rivalry news system currently relies on small, hardcoded string arrays (3 items each) for headlines and bodies across its generators, creating a significant variety gap that leads to rapid repetition.
**Action:** Expand template pools (aim for 6+ variants) for high-frequency narrative generators to maintain world depth across long sessions.

## 2026-07-09 - Expanded Race Commentary Templates

**Learning:** Race commentary arrays like START, FINISH, and STRETCH have very few entries (under 8), causing high repetition for core gameplay moments.
**Action:** Expanded these arrays directly in src/assets/narrative/templates.ts to ensure high-frequency text events stay fresh.

## 2026-07-06 - Commentary Variety Gap

**Learning:** Core race commentary events like START, STRETCH, FINISH, and GAP_ANNOUNCEMENT had few templates (4-8 each), causing noticeable repetition when players watch multiple races.
**Action:** Always maintain at least 8-12 variants for high-frequency events in generators to sustain immersion across many sessions.

## 2026-07-13 - Expanded Mid-Race Commentary Variety Gap

**Learning:** Core mid-race events like `LEAD_CHANGE`, `SURGE`, `FADE`, and `GAP_ANNOUNCEMENT`, as well as `BIOGRAPHICAL_TEMPLATES` had fewer than 10 templates, causing repetition during dense parts of a race replay.
**Action:** Expanded these arrays in `src/assets/narrative/templates.ts` to ~16 templates each to sustain variety across multiple races without needing generator logic changes.

## 2026-07-16 - Expanded Weekly News Variety Gap

**Learning:** The weekly flavor news generator (`generateWeeklyFlavorNews`) only had 8 variants each for headlines, generic bodies, and bodies featuring the top earner. This caused rapid repetition during long play sessions where this low-importance news item frequently appears.
**Action:** Expanded the `headlines`, `bodiesWithHorse`, and `genericBodies` arrays in `src/services/narrative/newsGenerator.ts` to 14 variants each to sustain narrative depth and immersion.

## 2026-07-20 - Expanded Follow-Up Race News Variety Gap

**Learning:** The follow-up race news generator (`generateFollowUpRaceNews`) had only 8 variants for headlines and bodies, leading to repetition.
**Action:** Expanded the `headlines` and `bodies` arrays in `src/services/narrative/newsGenerator.ts` to 14 variants each to increase variety and immersion.

## 2026-07-25 - Escaping dollar signs in JS template literal arrays

**Learning:** When using Node.js scripts (with `String.prototype.replace`) to inject JavaScript template strings into source code that contain a currency dollar sign followed immediately by a template variable (e.g., `Sold for $${formattedPrice}`), the literal `$` must be preserved correctly during the search-and-replace operation. If manipulating the file via basic string replacement, you must inject the literal `$` explicitly in your replacement string so it appears as `$${formattedPrice}` in the final `.ts` code.
**Action:** When injecting template variables that represent currency, verify that the `$` symbol is not consumed or omitted, ensuring the output retains the format `$${variableName}`.

## 2026-07-25 - Expanded Atmosphere Commentary Variety Gap

**Learning:** The ATMOSPHERE commentary array only had 12 templates, causing noticeable repetition during dense parts of a race replay.
**Action:** Expanded the ATMOSPHERE array in `src/assets/narrative/templates.ts` to 24 templates to sustain variety across multiple races.

## 2026-07-25 - Expanded Career Arc News Variety Gap

**Learning:** The career arc news generators (`generateRisingStarNews`, `generateContenderNews`, `generateChampionNews`, `generateBustNews`) only had 8 variants each for headlines and bodies, leading to rapid repetition of player milestones during long sessions.
**Action:** Expanded the `headlines` and `bodies` arrays in `src/services/narrative/careerArcGenerator.ts` to 14 variants each to increase variety and immersion.

## 2026-07-25 - Career Arc News Variety Gap

**Learning:** The career arc news generator (`generateRisingStarNews`, `generateContenderNews`, `generateChampionNews`, `generateBustNews`) had only 8 variants for headlines and bodies. This caused rapid repetition during long play sessions as horses hit milestones.
**Action:** Expanded the `headlines` and `bodies` arrays in `src/services/narrative/careerArcGenerator.ts` to 14 variants each to increase variety and immersion without logic changes.

## 2026-07-25 - Expanded Seed News Variety Gap

**Learning:** The seed news generator (`seedNewsGenerator.ts`) only had 8 variants each for headlines and bodies across its many internal builders (e.g. `buildSeasonOpener`, `buildPowerRankings`, etc.). This caused repetition during the start of seasons.
**Action:** Expanded the `headlines` and `bodies` arrays across all 7 builders in `src/services/narrative/seedNewsGenerator.ts` to 14 variants each to sustain narrative depth and immersion.

## 2026-07-25 - Expanded Mid-Race Commentary Variety Gap
**Learning:** The mid-race commentary arrays in `src/assets/narrative/templates.ts` for events like `POSITION_CHECK`, `DRAFTING`, `HOT_PACE`, `WEATHER_COMMENT`, `STABLE_WATCH`, `MILESTONE`, and `LANE_WATCH` had exactly 12 templates each, resulting in noticeable repetition over a long play session.
**Action:** Expanded each of these 7 event arrays by appending 4 new contextually appropriate variants (bringing the total to 16 each) to provide richer variety and deeper immersion without requiring any changes to the underlying commentary generator logic.

## 2026-07-26 - Expanded Biographical Commentary Variety Gap

**Learning:** The `BIOGRAPHICAL_TEMPLATES` array in `src/assets/narrative/templates.ts` only had 11 variants, causing rapid repetition during pre-race or mid-race biographical introductions.
**Action:** Expanded this array to 19 variants to ensure player-facing commentary remains fresh across multiple races.

## 2026-07-27 - Flavor News Array Added
**Learning:** Expanding news generator pools with context-neutral stories (like track upgrades or quirky backstretch events) immediately enlivens the world without risking logic side effects or breaking strict data dependencies. The `flavorStories` array in `src/services/narrative/newsGenerator.ts` is a great target for adding depth since it is completely decoupled from active game state while giving the illusion of a living, breathing ecosystem around the player.
**Action:** When adding static flavor arrays, I will focus on the peripheral world elements—like outriders, farriers, track staff, and fans—to flesh out the track atmosphere. I'll use regex/replacement scripts to safely append new templates in long arrays rather than attempting complex manual edits.
