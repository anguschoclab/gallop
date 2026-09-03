## 2024-09-04 - Accessible tooltips
**Learning:** TooltipContent is not reliably announced by screen readers. Furthermore, adding tooltips should use `<TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>` for consistent interactive standards.
**Action:** Ensure icon-only buttons always have a direct `aria-label` even when a tooltip is present, and import the appropriate delay constant.
