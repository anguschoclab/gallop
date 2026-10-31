## 2026-10-31 - Enriched Follow-Up Race News Variety
**Learning:** The follow-up race news generator (`src/domains/narrative/simulation/newsSpotlight.ts`) has a strict grammatical test (e.g. `12.13`) that prohibits the word 'effort' in body templates.
**Action:** Used allowed synonyms like 'performance', 'display', or 'showing' instead when adding new body variants to maintain test stability while increasing narrative variety.
