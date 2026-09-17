## 2024-05-17 - Avoid native title attribute for tooltips
**Learning:** The native HTML `title` attribute provides a poor and often inaccessible tooltip experience, particularly on icon-only elements or custom components.
**Action:** When adding tooltips to interactive elements or replacing existing `title` attributes, always use the repository's custom `<Tooltip>`, `<TooltipProvider>`, `<TooltipTrigger>`, and `<TooltipContent>` components (imported from `@/components/ui/tooltip`) along with `TOOLTIP_DELAY_MS` (from `@/constants`).
