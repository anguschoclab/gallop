## 2024-09-24 - Directive Change News Variety
**Learning:** The directive news generator (`src/core/narrative/directiveNewsGenerator.ts`) only has 8 variants for each category, leading to repetitive news for financial distress and standard strategy shifts, capping content variety by code, not data.
**Action:** Expand the `headlines` and `bodies` arrays for `isDistressShift` and standard strategy shifts to 16 variants to increase variety.
