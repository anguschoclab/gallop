## 2025-02-14 - Icon-only button accessibility in shadcn/ui
**Learning:** The project makes heavy use of shadcn/ui components. Icon-only instances of the `Button` component (e.g., `size="icon"` with lucide-react icons) often only have a `title` attribute, which is insufficient for screen readers.
**Action:** Always verify that `aria-label` attributes are present on `size="icon"` `Button` components. A `title` attribute is good for hover tooltips but must be accompanied by an `aria-label`.
