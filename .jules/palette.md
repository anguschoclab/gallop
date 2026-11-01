## 2025-02-12 - Missing tooltips on market price alerts
**Learning:** Found an accessibility issue pattern where secondary icon-only buttons (like "Edit") and non-destructive action buttons (like "Pause/Resume") in `PriceAlertsPanel` were missing standard Tooltip components, while the "Delete" action had one.
**Action:** When working on list items or cards with multiple secondary actions, ensure every icon-only or condensed button is wrapped in a `<TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>` to provide clear textual labels for screen readers and sighted users.
