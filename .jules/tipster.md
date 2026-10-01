## 2023-10-24 - Jockey Chemistry Insight
**Learning:** When generating insights that require relational data (like resolving a jockey's name from `jockeyId`), the insight detector must remain a pure function and shouldn't access global game state directly. Instead, return the necessary IDs in the `HorseInsight` object (e.g., `jockeyId`) and use placeholders in the text.
**Action:** Always fetch the relational data in the UI layer (e.g., `HorseAnalyticsSection`) using global state hooks (`useGame`) and replace the placeholders in the insight text dynamically.
