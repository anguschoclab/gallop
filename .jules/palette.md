## 2026-07-04 - Add explicit label association in StaffNegotiationDialog

**Learning:** Found a missing htmlFor/id association in the staff negotiation dialog input, which reduces screen reader accessibility and clickable area.
**Action:** Add id to inputs and htmlFor to labels to explicitly link them together for accessibility.

## 2024-07-06 - Accessible Icon Buttons Require Tooltips

**Learning:** Found multiple icon-only `Button` elements with `size="icon"` in widgets and cards (e.g. `CircuitWidget`, `StableRosterWidget`, `HQOpsWidget`, `ImperialOutpostManager`) that have `aria-label`s for screen readers but lack visual `Tooltip`s for sighted users. Sighted users need visual explanations for generic or obscure icons like `ChevronRight` or `ArrowRightLeft`.
**Action:** Always wrap `size="icon"` Buttons in `@/components/ui/tooltip` (`TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`) to provide visual hover context, mapping the `aria-label` text to the tooltip content.

## 2024-07-10 - Dynamic Label Association with useId

**Learning:** In reusable form components (like `FieldWithRandom` in wizards) where fields can be rendered multiple times, static string IDs risk collisions. React's `useId()` safely generates unique IDs to bind `<label htmlFor>` to inputs or triggers, ensuring robust screen reader compatibility and expanding the clickable hit area without hardcoded values.
**Action:** Use `useId()` when tying labels to form elements inside mapped arrays or generic wrapper components to maintain strong accessibility relationships dynamically.

## 2026-07-28 - Missing label association in Filter Panels

**Learning:** Reusable filter panels (like `JockeyFilterPanel`) often use a `<label>` to describe what the user should search for, but fail to explicitly link the label to the `<Input>` using `htmlFor` and `id`. This creates a broken association for screen readers. Using `useId()` generates a robust and unique identifier that perfectly bridges this gap and ensures reliable screen-reader compatibility without risking ID collisions when components are rendered multiple times or dynamically.
**Action:** When updating or building filter forms/panels with `<Input>`, always associate `<label>` and `<Input>` explicitely via `useId()`.
