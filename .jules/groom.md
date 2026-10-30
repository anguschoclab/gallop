## 2026-10-30 - Standardize Compare Table Empty States
**Learning:** List and table views in the comparison tools (like StableCompareTable) were rendering raw ad-hoc empty markup instead of the standardized empty state.
**Action:** Always replace ad-hoc empty markup with the `EmptyState` component using `icon`, `title`, and `description` props to maintain consistency across the app.
