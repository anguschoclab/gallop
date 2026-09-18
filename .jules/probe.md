## 2024-05-30 - Discovered untesteed core breeding functions

**Learning:** Pure functions governing core breeding logic (`calculateConformationCompatibility`, `calculateTemperamentCompatibility` in `src/core/breeding/traitCompatibility.ts` and `calculateGeneticCompatibility` in `src/core/breeding/genotypeMatching.ts`) have completely missing test files. These functions define essential gameplay mechanics for horse breeding compatibility, a cornerstone feature.

**Action:** Add focused tests for these pure logic functions to ensure edge cases (e.g. trait strings vs trait numbers, warning conditions like homzygous Leopard complex or dourine infection) do not silently break.
