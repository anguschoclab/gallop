## 2024-05-19 - Standardized disabled button tooltips
**Learning:** We have many duplicate implementations of `DisabledTooltipWrapper` or raw `TooltipProvider` wrapping disabled buttons with a `tabIndex={0}` span and `pointer-events-none` on the button across various files.
**Action:** Extract this pattern to a reusable UI component `DisabledTooltipWrapper` to unify disabled reason presentation and ensure developers don't forget the accessibility span wrapper.
