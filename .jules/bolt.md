## 2024-05-18 - Optimize O(N^2) object recreation in Auction logic
**Learning:** Re-creating a dictionary using `Object.fromEntries(arr.map())` inside loops (like `generateAuctionLots`) or frequently called evaluation functions (`calculateLotValuation`) introduces a severe O(N^2) performance bottleneck when dealing with thousands of horses.
**Action:** Use reference-based memoization (`if (arr === cachedArr) return cachedMap`) or hoist dictionary creation outside the loop to prevent O(N^2) complexity bottlenecks.
