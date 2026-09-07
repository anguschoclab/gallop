## 2024-05-15 - Replace native title with proper Tooltip
**Learning:** Using native `title` attribute for icon-only buttons provides a substandard UX (slow appearance, unstylable) and lacks proper accessibility mapping compared to the app's standard custom Tooltip.
**Action:** Always replace `title` attributes on icon-only buttons with `<TooltipProvider>`, `<Tooltip>`, `<TooltipTrigger asChild>`, `<TooltipContent>` components, and ensure the button has a direct `aria-label`.
