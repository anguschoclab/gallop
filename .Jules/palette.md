## 2023-11-01 - Replace native title with DisabledTooltipWrapper
**Learning:** Using native HTML `title` attributes on interactive elements (especially buttons that can be disabled) provides poor UX due to inconsistent display, uncustomizable delays, and lack of keyboard focus accessibility.
**Action:** Always use the custom `@/shared/ui/DisabledTooltipWrapper` for interactive controls that require a tooltip, and ensure the `reason` prop is used instead of the `title` attribute.
