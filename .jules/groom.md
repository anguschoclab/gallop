## 2024-09-28 - Tooltips for Icon-Only Buttons
**Learning:** Some icon-only buttons lacked tooltips and aria-labels which is important for accessibility and general UX. The codebase has a pattern for this (TooltipProvider, Tooltip, TooltipTrigger, TooltipContent).
**Action:** When adding new icon-only buttons, wrap them in Tooltip elements with `TOOLTIP_DELAY_MS`.
