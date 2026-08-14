## 2024-08-15 - Head-to-Head Insight / Favorite Partner
**Learning:** Jockeys are connected to horses through `horse.raceHistory`.
We created `src/core/jockey/insights.ts` that exports `getJockeyInsight(jockey: Jockey, horses: Record<string, Horse>): JockeyInsight | null`.
It provides "Favorite Mount", "Big Race Rider", and "Iron Rider" insights.

Wait, I should test this within the app UI. Let's add it to `JockeyCard`.
