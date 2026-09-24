## 2024-05-15 - [Consistent Tooltips for Icon-only Buttons]
**Learning:** Found multiple instances of icon-only buttons (`size="icon"`) using standard button rendering without tooltips across various components (`StableCompareBar`, `PriceAlertsPanel`, `TransportPlanner`, `ImperialOutpostManager`). This creates a poor user experience, especially for screen readers and those unfamiliar with the icons.
**Action:** Next time when seeing `size="icon"`, always make sure to add `Tooltip`, `TooltipProvider` and `TooltipContent`.
