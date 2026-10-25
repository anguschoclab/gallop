## 2025-02-24 - Test fanCount scaling for getBroodmareFee
**Learning:** The `fan count valuation` test suite comprehensively covered valuation functions (like `calculateBaseHorseValue`, `horsePrice`, `estimateBreedingValue`, `horseMarketValue`, `horseCareerValuation`), but completely missed asserting that a mare's `fanCount` affects her `getBroodmareFee`.
**Action:** Added a specific test asserting that `getBroodmareFee` scales with `fanCount` for eligible mares.
