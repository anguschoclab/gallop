## 2025-02-05 - Added Missing aria-label to AttachmentBreakdown

**Learning:** When using the custom `TooltipProvider` and `Tooltip` component structures, missing `aria-label` properties on internal buttons (like info icons) can severely hinder accessibility for screen reader users by removing context.
**Action:** When adding small info or affordance buttons, ensure they always have a descriptive `aria-label` alongside the visual icon, and that the wrapper `TooltipProvider` always specifies a `delayDuration`.
