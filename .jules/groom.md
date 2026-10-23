## 2024-05-18 - Added Tooltip to Disabled Buy Buttons
**Learning:** When buttons are disabled for game logic reasons (like insufficient funds), they silently block users and fail accessibility standards for keyboard users.
**Action:** Always wrap conditionally disabled action buttons with `DisabledTooltipWrapper` from `@/shared/ui/DisabledTooltipWrapper` passing a clear `reason`.
