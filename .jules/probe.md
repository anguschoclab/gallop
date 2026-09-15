## 2024-05-19 - Market Order Books and Depth Generators Coverage
**Learning:** Testing pure transformation functions for market mechanisms (like order book building and depth aggregation) in isolation requires careful attention to the temporal validity of mock data, as these functions aggressively filter based on expiration days and object lifecycles.
**Action:** When creating mock exchange orders (asks/bids) for isolated tests, explicitly extend their `expiresDay` far beyond the evaluation `day` to prevent silent omission during transformation pipelines.
