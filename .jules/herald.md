## 2025-05-18 - Added variety to directive change news
**Learning:** Found a narrative generator (`directiveNewsGenerator.ts`) that returned a single static template for all directive changes. Variety in these common operational shifts is needed for a long save.
**Action:** Introduced arrays of headlines and bodies, utilizing the existing seeded RNG (`rng.pick()`) to provide 6 distinct variants for both headlines and body text while maintaining the exact same logic.
