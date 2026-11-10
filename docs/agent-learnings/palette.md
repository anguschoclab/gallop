## 2024-05-24 - Missing ARIA label on delete button
**Learning:** Found a delete button in `PlanSummaryBar` component that uses only a `Trash2` icon without any accessible text or `aria-label`. This makes it completely invisible/unusable to screen reader users since they have no context for what the button does.
**Action:** Always add an `aria-label` to icon-only buttons (`size="icon"`). Especially for destructive actions like delete.
