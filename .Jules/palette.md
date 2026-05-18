## 2026-05-17 - Add ARIA Labels to Color Swatches
**Learning:** Found custom button elements mimicking color swatches in the New Game Wizard's StepSilks component that lacked any accessible name.
**Action:** Always ensure color swatch `<button>`s or interactive color indicators get dynamic `aria-label` attributes describing the specific color chosen.

## 2026-05-15 - Adding aria-labels to icon-only buttons
**Learning:** Shadcn UI Button components with `size="icon"` and `title` tags often lack explicit `aria-label`s for screen reader accessibility in this application.
**Action:** Always ensure that any icon-only Button explicitly declares an `aria-label` along with the title.
## 2026-05-18 - Found missing aria-label in custom UI components
**Learning:** Found an icon-only delete button in SaveLoadDialog using the Trash2 icon without any accessible text. This highlights a pattern where custom action buttons outside of the global shadcn/ui components may lack proper accessibility attributes.
**Action:** Always verify custom UI buttons, especially those using icons for destructive actions, include aria-label and title attributes.
