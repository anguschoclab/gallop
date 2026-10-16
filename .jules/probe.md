## 2024-10-16 - getG1WinsForJockey attribution
**Learning:** `getG1WinsForJockey` maps horse race history into race state correctly, but this pure logic was untested. The `races` state must mock `entries` for the matching `raceId` where the `horseId` matches `jockeyId`.
**Action:** Added tests for the happy path and two negative cases. Used minimal mocked `GameState`.
