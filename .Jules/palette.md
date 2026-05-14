## 2023-10-27 - Add ARIA Labels to Stable Action Buttons
**Learning:** In list and table views (like the Stable Index `ledger` view), action buttons (e.g., "Filter roster", "Open training room", "Open mission plan") often use icon-only elements such as `<Button size="icon">` or `p-0` with an icon component inside. Including only a `title` attribute for these buttons results in poor accessibility for screen readers. A descriptive `aria-label` attribute (e.g., context-aware labels using the horse name) should always be provided to describe the intent.
**Action:** Always add `aria-label` attributes to custom icon-only `<Button>` elements.

## 2026-05-12 - Add ARIA Labels to Dialog and Card Action Buttons
**Learning:** In interactive dialogs and summary cards (like `FoalNamingDialog` and `JockeyCard`), action buttons (e.g., Generate random name, Reroll Silks) often use custom raw `<button>` tags with icon-only elements (e.g., `RefreshCw`). Similar to shadcn/ui `<Button>` components, relying solely on a `title` attribute for these raw tags results in poor accessibility for screen readers. A descriptive `aria-label` attribute must be provided to describe the intent.
**Action:** Always add `aria-label` attributes to custom icon-only raw `<button>` elements, even when they fall outside standard UI component usage.
