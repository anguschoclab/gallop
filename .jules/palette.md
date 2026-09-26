## 2024-06-25 - Add tooltips to icon-only buttons
**Learning:** It is common to miss wrapping icon-only buttons with tooltips, which negatively impacts accessibility as screen readers only read the aria-label and visually impaired users may have trouble identifying the action. Consistent use of tooltips solves this pattern.
**Action:** Ensure all newly created icon-only buttons (`size="icon"`) are wrapped in `TooltipProvider` and `Tooltip`.
