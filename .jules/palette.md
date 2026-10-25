## 2024-10-26 - Add explanation for disabled buy buttons
**Learning:** Disabled call-to-action buttons (like buying a horse) without tooltips leave users guessing why they can't take action. In management games, financial limits are common but should be explicitly stated.
**Action:** Always wrap disabled financial/action buttons with `DisabledTooltipWrapper` to explain exactly why the action is blocked (e.g., "Insufficient capital").
