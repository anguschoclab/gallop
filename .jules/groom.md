## 2024-07-07 - Add stable empty states outside view toggle

**Learning:** When a component has multiple view modes (e.g., list vs gallery), implementing the empty state inside only one of the view branches leaves the other views blank when empty. Empty states must be implemented at the highest level possible, before branching into view-specific rendering logic. Also, empty states should be context-aware (distinguishing between "no data ever" and "no data matching filter") and should provide actionable next steps (e.g. Go to Market).

**Action:** Always place empty state checks before view-toggle ternary operators in components that render collections. Verify that when `items.length === 0`, all view modes gracefully fall back to the empty state. And if the user has genuinely no data, provide actionable onboarding links to help them acquire it.
