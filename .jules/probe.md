## 2024-10-27 - Added test coverage for awards/scoring

**Learning:** Testing logic involving geographical region checks (e.g. `isEligibleForCategory` or region grouping) requires setting up `track` properties in mock races correctly because `calculateAwardPoints` uses the `track` name mapped to `Continent` via `COUNTRY_TO_CONTINENT`.
**Action:** Use accurate existing track names from `src/data/trackToCountry.ts` (e.g., 'Belmont Park', 'Ascot', 'Flemington') in mock race configurations when testing any geographical/continental filters in the simulation.
