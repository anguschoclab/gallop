## 2024-05-24 - Add ARIA label to Tooltip Trigger Buttons
**Learning:** In this application's components, `<TooltipContent>` is insufficient for screen readers when using an icon-only button within `<TooltipTrigger asChild>`. A descriptive `aria-label` must be applied directly to the `<button>` element to ensure accessibility.
**Action:** Always include an explicit `aria-label` on `<button>` elements that contain only icons, even when they are wrapped in a tooltip provider.
