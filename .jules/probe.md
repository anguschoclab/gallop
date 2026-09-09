## 2024-05-14 - Auction Resolution Bidding Tests
**Learning:** `resolveAuctionSale` is the core of auction logic but testing the actual bidding war relies on mocking the pure function `calculateNpcBid` because of complex internal RNG usage that simulates varying bid jumps.
**Action:** Mock `calculateNpcBid` directly in `resolveAuctionSale` tests using `vi.spyOn(engine, "calculateNpcBid")` and inject deterministic bid limits to reliably simulate multi-party bidding wars without deep RNG mocking.
