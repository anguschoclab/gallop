## 2024-10-24 - Use DisabledTooltipWrapper for disabled button tooltips
**Learning:** Raw Radix Tooltip implementations for disabled buttons cause inconsistency, duplicate wrapper markup (`<span tabIndex={0}>`), and omit standard tooltip delays.
**Action:** Always use the standardized `<DisabledTooltipWrapper>` from `@/shared/ui/DisabledTooltipWrapper` to encapsulate tooltips for disabled interaction points (like buttons), ensuring accessibility semantics and consistent delay settings.
