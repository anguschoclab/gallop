## 2024-05-24 - Consistent Tooltips over Native Title Attributes
**Learning:** When using icon-only action buttons (like 'Compare' or 'Bookmark' hovering over cards), relying on native `title` attributes causes inconsistent visual experiences and unpredictable screen reader behavior compared to custom UI tooltips.
**Action:** Always wrap icon-only floating actions in `<TooltipProvider>` with `asChild` triggers to ensure visual consistency and reliable accessibility across the application.
