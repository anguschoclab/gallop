## 2024-08-14 - Tooltips on disabled buttons
**Learning:** Disabled buttons natively swallow mouse events, preventing tooltips from appearing.
**Action:** Wrap the disabled button in a focusable element (e.g., `<span tabIndex={0}>`) and apply `pointer-events-none` to the button itself so the wrapper can accurately receive and trigger hover events. Ensure `tabIndex` is applied conditionally or the element is only rendered when disabled to prevent a 'double-tab' accessibility issue.
