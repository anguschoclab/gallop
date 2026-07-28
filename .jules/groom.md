## 2024-07-07 - Add stable empty states outside view toggle

**Learning:** When a component has multiple view modes (e.g., list vs gallery), implementing the empty state inside only one of the view branches leaves the other views blank when empty. Empty states must be implemented at the highest level possible, before branching into view-specific rendering logic. Also, empty states should be context-aware (distinguishing between "no data ever" and "no data matching filter") and should provide actionable next steps (e.g. Go to Market).

**Action:** Always place empty state checks before view-toggle ternary operators in components that render collections. Verify that when `items.length === 0`, all view modes gracefully fall back to the empty state. And if the user has genuinely no data, provide actionable onboarding links to help them acquire it.

## 2024-07-28 - Tooltips on disabled elements

**Learning:** Disabled elements (like buttons with \`disabled\` prop) swallow mouse events, preventing standard \`TooltipTrigger\` from working. If we want a disabled button to explain _why_ it's disabled, we must wrap it in a focusable span with \`cursor-not-allowed\` and add \`pointer-events-none\` to the button itself, or similar techniques, so the wrapper can trigger the tooltip.

**Action:** When adding tooltips to explain disabled states, use the \`DisabledTooltipWrapper\` pattern or wrap the button in \`<span tabIndex={0} className="inline-block cursor-not-allowed">\` and add \`pointer-events-none\` to the disabled button.

## 2024-07-27 - Polishing Empty States in Rival Archives

**Learning:** List views, like the Rival Archives, often default to plain text "No data available" when filtered to zero results.
**Action:** Always provide a polished empty state (icon, clear message, and action button like "Clear Filters") consistent with the rest of the app (e.g., StableRosterView) when lists or tables are empty.

## 2024-11-20 - Tooltips on disabled elements in action bars

**Learning:** When using the tooltip pattern for disabled buttons (wrapping with a focusable span), ensure the `TooltipProvider` wraps the `<Tooltip>` element locally if the app does not have a global provider, otherwise Shadcn tooltip components will throw a Context error in tests or runtime. Additionally, `pointer-events-none` is required on the disabled `<Button>` child to let the wrapper receive mouse events and trigger the tooltip on hover.

**Action:** When applying tooltips to disabled buttons, wrap them as `<TooltipProvider><Tooltip><TooltipTrigger><span tabIndex={0} className="inline-block cursor-not-allowed"><Button disabled className="pointer-events-none">...</Button></span>...`
>>>>>>> origin/groom-tooltip-fix-1308946897783319793
