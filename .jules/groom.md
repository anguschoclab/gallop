## 2024-10-21 - Standardize Empty States
**Learning:** Found an ad-hoc empty state implemented with a simple `<p>` element in the stable campaign page, which diverges from the established standard.
**Action:** Replaced the `<p>` element with the shared `EmptyState` component (`@/shared/ui/common/EmptyState`) to maintain consistent, polished UX across all views.
