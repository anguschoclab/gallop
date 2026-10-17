## 2024-05-15 - Use DisabledTooltipWrapper for disabled buttons
**Learning:** The codebase has a dedicated `DisabledTooltipWrapper` component to provide tooltips for disabled elements, ensuring accessible and consistent explanations.
**Action:** Always use `DisabledTooltipWrapper` instead of manually constructing Tooltip Providers and triggers with `cursor-not-allowed` when providing feedback for disabled states.
