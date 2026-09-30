## 2025-03-01 - Icon Button Tooltips
**Learning:** Found several icon-only `<Button size="icon">` components without Tooltips (just `aria-label`s), which rely solely on screen readers and are difficult for sighted users to decipher their intent since they only display an icon.
**Action:** When creating icon-only buttons, always wrap them in `<TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>`, `<Tooltip>`, `<TooltipTrigger asChild>`, and `<TooltipContent>` to ensure visual users have the same access to the descriptive label as screen-reader users do via `aria-label`.
