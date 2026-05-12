## 2024-05-18 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Found multiple instances where icon-only buttons (like `<Button size="icon">` with nested Lucide icons) were used without `aria-label`s, sometimes relying only on a `title` attribute. The `title` attribute is often insufficient for robust screen reader support across all browser/assistive technology combinations.
**Action:** Always verify that icon-only interactive elements explicitly provide an `aria-label` to guarantee screen readers can announce their purpose accurately, rather than just relying on generic nested contents or `title` tags.

## 2024-05-19 - Accessible Custom Controls in Specialized Views
**Learning:** In specialized, custom UI elements like the `RaceVisualizer` canvas overlay, it's common to use standard `<button>` tags with custom styling instead of the global `<Button>` component for layout reasons. However, these custom controls are frequently missed during accessibility sweeps and often lack dynamic `aria-label` and `title` attributes that update based on their current state (e.g., Play vs. Pause).
**Action:** When working on complex visualization components with custom controls, explicitly verify that interactive overlays include both dynamic `aria-label`s for screen readers and `title` tooltips for sighted users.
