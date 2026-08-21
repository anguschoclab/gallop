## 2025-03-09 - Added Flavor Stories
**Learning:** The game world includes flavor stories that generate background simulation feeling by pulling from `src/services/narrative/flavorStories.ts`. The structure includes `track`, `jockeys`, `breeding`, `weather`, `community`, and `industry` sections. Each flavor entry is a plain object with `headline`, `body`, and `category: "flavor"` parameters.
**Action:** When adding more background flavor to the narrative system, append new items to the arrays in `src/services/narrative/flavorStories.ts` following existing themes and formatting.
