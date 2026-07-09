## 2026-07-05 - Rivalry News Variety Gap
**Learning:** The rivalry news system currently relies on small, hardcoded string arrays (3 items each) for headlines and bodies across its generators, creating a significant variety gap that leads to rapid repetition.
**Action:** Expand template pools (aim for 6+ variants) for high-frequency narrative generators to maintain world depth across long sessions.

## 2026-07-09 - Expanded Race Commentary Templates
**Learning:** Race commentary arrays like START, FINISH, and STRETCH have very few entries (under 8), causing high repetition for core gameplay moments.
**Action:** Expanded these arrays directly in src/assets/narrative/templates.ts to ensure high-frequency text events stay fresh.
