## 2024-09-18 - Enforce Alert Dialogs for Destructive Actions
**Learning:** The native Radix/shadcn `AlertDialog` enforces focus trapping and uses `role="alertdialog"`, which makes it significantly more accessible for destructive actions compared to a standard `Dialog`. Standard dialogs should be avoided for actions like resetting progress or deleting data.
**Action:** When implementing destructive confirmations, always default to using `AlertDialog` rather than standard `Dialog`.
