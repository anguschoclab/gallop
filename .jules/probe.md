## 2026-08-15 - Campaign planner aptitude verification testing
**Learning:** The `updateCampaignAptitudes` logic relies on specific thresholds (3 total starts, 60% majority) to "confirm" surface or distance preferences dynamically, a key part of horse evaluation in campaigns.
**Action:** Implemented a targeted, deterministic unit test (`planner.test.ts`) that asserts exactly when thresholds are crossed and when aptitudes should remain unconfirmed, locking down this critical auto-campaign evaluation behavior without the heavy machinery of a full game loop simulation.
