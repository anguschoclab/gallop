## 2025-02-28 - Unified empty states
**Learning:** Shared UI primitives exist (like `EmptyState`) to unify visual design when there is no data to show in a table or list. Hardcoded raw text or plain divs for empty states makes the UI feel unpolished.
**Action:** Always prefer importing and using `@/shared/ui/common/EmptyState` over raw `<p>No data</p>` text tags.
