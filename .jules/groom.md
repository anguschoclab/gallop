## 2024-07-07 - Add stable empty states outside view toggle

**Learning:** When a component has multiple view modes (e.g., list vs gallery), implementing the empty state inside only one of the view branches leaves the other views blank when empty. Empty states must be implemented at the highest level possible, before branching into view-specific rendering logic. Also, empty states should be context-aware (distinguishing between "no data ever" and "no data matching filter") and should provide actionable next steps (e.g. Go to Market).

**Action:** Always place empty state checks before view-toggle ternary operators in components that render collections. Verify that when `items.length === 0`, all view modes gracefully fall back to the empty state. And if the user has genuinely no data, provide actionable onboarding links to help them acquire it.

## 2024-07-28 - Tooltips on disabled elements

**Learning:** Disabled elements (like buttons with \`disabled\` prop) swallow mouse events, preventing standard \`TooltipTrigger\` from working. If we want a disabled button to explain _why_ it's disabled, we must wrap it in a focusable span with \`cursor-not-allowed\` and add \`pointer-events-none\` to the button itself, or similar techniques, so the wrapper can trigger the tooltip.

**Action:** When adding tooltips to explain disabled states, use the \`DisabledTooltipWrapper\` pattern or wrap the button in \`<span tabIndex={0} className="inline-block cursor-not-allowed">\` and add \`pointer-events-none\` to the disabled button.

## 2024-07-27 - Polishing Empty States in Rival Archives

**Learning:** List views, like the Rival Archives, often default to plain text "No data available" when filtered to zero results.
**Action:** Always provide a polished empty state (icon, clear message, and action button like "Clear Filters") consistent with the rest of the app (e.g., StableRosterView) when lists or tables are empty.
