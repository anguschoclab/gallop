## 2026-05-17 - Add ARIA Labels to Color Swatches

**Learning:** Found custom button elements mimicking color swatches in the New Game Wizard's StepSilks component that lacked any accessible name.
**Action:** Always ensure color swatch `<button>`s or interactive color indicators get dynamic `aria-label` attributes describing the specific color chosen.

## 2026-05-15 - Adding aria-labels to icon-only buttons

**Learning:** Shadcn UI Button components with `size="icon"` and `title` tags often lack explicit `aria-label`s for screen reader accessibility in this application.
**Action:** Always ensure that any icon-only Button explicitly declares an `aria-label` along with the title.

## 2026-05-19 - Accessible Delete Button in LedgerEntry

**Learning:** The Delete button in `LedgerEntry` within `src/components/settings/SaveLoadDialog.tsx` was an icon-only button lacking an accessible name.
**Action:** Always add an `aria-label` and a `title` to icon-only action buttons (e.g., Delete, Edit) to ensure screen readers can announce their purpose, using context when available (e.g., `Delete save ${save.name}`).

## 2024-05-19 - Fixed dead-end button in AuctionSummary

**Learning:** Found a "Return to Sales" `<Button>` that had no `onClick` handler, despite the parent `AuctionSummary` component correctly taking an `onClose` prop and defining a routing navigation fallback (`navigate({ to: "/auction" })`) in its parent container (`AuctionTheater.tsx`). This resulted in a dead-end UI for users.
**Action:** Always verify that main structural flow buttons map their defined callback props (like `onClose` or `onSubmit`) instead of being purely decorative.

## 2024-05-19 - Accessible Time Skip Buttons in AppShell

**Learning:** Discovered that the time advancement buttons in `AppShell` (like "7d" and "30d") only utilized `title` attributes for tooltips, lacking explicit `aria-label`s, which meant screen readers might read the brief text ("7 d", "30 d") rather than the descriptive action.
**Action:** Ensure that buttons with abbreviated or abstract text content have explicit `aria-label` attributes to provide clear, descriptive context to assistive technologies.
