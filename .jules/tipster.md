## 2024-10-24 - Deriving Yield from Lifetime Earnings
**Learning:** The `Horse` model tracks `lifetimeEarnings` and `careerStarts` but does not directly store a `purchasePrice` or `ROI`. Economic insights like average earnings per start (Yield) must be derived from these lifetime aggregates rather than attempting to cross-reference past auction records which may not exist.
**Action:** Use `lifetimeEarnings` and `careerStarts` as the basis for profitability/yield insights, ensuring we handle the `careerStarts === 0` edge case to avoid division by zero.
