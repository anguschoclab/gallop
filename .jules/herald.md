## 2024-08-19 - Flavor Stories System Discovery
**Learning:** `src/services/narrative/flavorStories.ts` contains simple, static flavor news (no dynamic template variables) separated into themes (`track`, `jockeys`, `breeding`, `weather`, `community`, `industry`). The tone is professional but colorful, simulating realistic backstretch chatter and industry news. There are currently only 42 stories total, leading to frequent repetition over a long career.
**Action:** Add more variants to the existing `FLAVOR_STORIES` array across the different themes to quickly and safely add content depth without touching any game logic.
## 2026-09-02 - Jockey Trait Repetition
**Learning:** Jockey trait commentaries repeat quickly (only 3 variants each). Tone must remain an energetic, professional sports broadcast highlighting the dynamic between the rider's skill and the horse.
**Action:** Always verify the number of variants for highly-frequent events and expand them to at least 5-6 to maintain immersion.
