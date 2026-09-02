## 2024-09-02 - Use Tooltips instead of native title attributes
**Learning:** Avoid using the native HTML `title` attribute for tooltips on interactive elements. Instead, utilize the custom `<Tooltip>` and `<TooltipProvider>` components.
**Action:** Always use `<TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>`, `<Tooltip>`, `<TooltipTrigger>`, and `<TooltipContent>` instead of `title` attributes on buttons and spans to ensure consistent visual styling and predictable screen reader accessibility.
