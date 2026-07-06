## 2026-07-04 - Add explicit label association in StaffNegotiationDialog
**Learning:** Found a missing htmlFor/id association in the staff negotiation dialog input, which reduces screen reader accessibility and clickable area.
**Action:** Add id to inputs and htmlFor to labels to explicitly link them together for accessibility.

## 2024-07-06 - Accessible Icon Buttons Require Tooltips
**Learning:** Found multiple icon-only `Button` elements with `size="icon"` in widgets and cards (e.g. `CircuitWidget`, `StableRosterWidget`, `HQOpsWidget`, `ImperialOutpostManager`) that have `aria-label`s for screen readers but lack visual `Tooltip`s for sighted users. Sighted users need visual explanations for generic or obscure icons like `ChevronRight` or `ArrowRightLeft`.
**Action:** Always wrap `size="icon"` Buttons in `@/components/ui/tooltip` (`TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`) to provide visual hover context, mapping the `aria-label` text to the tooltip content.
