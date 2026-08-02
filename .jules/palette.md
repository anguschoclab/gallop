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

## 2024-07-28 - Missing label association in StaffNegotiationDialog

**Learning:** I found that `StaffNegotiationDialog` had an incorrect label association: the label used a static `htmlFor="offerAmount"`, but the `id` was not set on the `<Input>` correctly or was missing. Static IDs can cause collision issues if the dialog is rendered multiple times.
**Action:** Use `useId()` when explicitly binding `<label>` and `<Input>` in forms and dialogs to ensure proper screen reader association without risk of ID collisions.

## 2024-07-31 - Replace Native Titles with Tooltips for Custom Controls

**Learning:** Custom UI controls like the race visualizer's playback buttons (`.race-control-btn`) used native `title` attributes for tooltips, which look inconsistent and often lack accessibility hooks compared to the app's standard `Tooltip` component.
**Action:** When implementing custom icon-only button groups (even those not using the standard `Button` component), wrap them with the design system's `Tooltip` components (`Tooltip`, `TooltipTrigger`, `TooltipContent`) rather than relying on native `title` attributes to ensure consistent visual polish and accessibility. Note that individual Tooltips should not be wrapped with `TooltipProvider` as it should only wrap the app root.
## 2025-01-20 - Missing label association in PrivateSaleOfferDialog

**Learning:** Found a missing htmlFor/id association in the private sale offer dialog input, which reduces screen reader accessibility and clickable area. Using `useId()` reliably maps the label to the input element dynamically.
**Action:** Always wrap standard inputs in standard components and associate them to their matching `label` via `useId()` and explicit `htmlFor` / `id` mapping.

## 2026-07-31 - Prop Drilling IDs to Custom Components

**Learning:** When using custom Input components wrapped in a layout (e.g. `BidInput` or `MaxBidInput`), a standard `<label>` next to it must point to the actual `<input>` element within that custom component for screen readers to work correctly.
**Action:** Always drill an `id` prop down through custom components to the raw `<input>` element inside, and associate it with a unique ID via `useId()` and `htmlFor` on the `<label>`.
