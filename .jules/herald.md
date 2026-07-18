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
## 2026-07-25 - Expanded Atmosphere Commentary Variety Gap

**Learning:** The ATMOSPHERE commentary array only had 12 templates, causing noticeable repetition during dense parts of a race replay.
**Action:** Expanded the ATMOSPHERE array in `src/assets/narrative/templates.ts` to 24 templates to sustain variety across multiple races.
