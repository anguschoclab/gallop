## 2025-02-09 - Accessible Tooltips for Icon Buttons
**Learning:** Icon-only buttons (like delete or clear actions) without text labels cause confusion and poor screen reader experiences.
**Action:** Always wrap icon-only `<Button size="icon">` components in `<TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>`, `<Tooltip>`, `<TooltipTrigger asChild>`, and `<TooltipContent>` with descriptive text, and apply an `aria-label` attribute directly to the button for screen readers.
