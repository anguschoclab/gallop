## 2024-08-19 - Flavor Stories System Discovery
**Learning:** `src/services/narrative/flavorStories.ts` contains simple, static flavor news (no dynamic template variables) separated into themes (`track`, `jockeys`, `breeding`, `weather`, `community`, `industry`). The tone is professional but colorful, simulating realistic backstretch chatter and industry news. There are currently only 42 stories total, leading to frequent repetition over a long career.
**Action:** Add more variants to the existing `FLAVOR_STORIES` array across the different themes to quickly and safely add content depth without touching any game logic.

## 2025-02-28 - Race Commentary Atmosphere Expansion
**Learning:** The live commentary system (`NarrativeGenerator` and `src/assets/narrative/atmosphereTemplates.ts`) has good core mechanics for track-specific flavor (Triple Crown, elevation, etc.), but the template pools for `ATMOSPHERE_TRIPLE_CROWN_TEMPLATES` and `ATMOSPHERE_ELEVATION_TEMPLATES` are small (8 each), risking repetition in long playthroughs where these events trigger.
**Action:** Enhance variety by adding new templates that strictly use existing placeholders (`{trackName}`, `{elevation}`) and fit seamlessly into the existing string arrays without altering the event detection logic.
