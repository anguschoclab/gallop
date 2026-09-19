## 2024-05-24 - Semantic dialogs for destructive actions
**Learning:** Using `AlertDialog` instead of standard `Dialog` for destructive actions like deleting game progress ensures focus is strictly trapped and appropriate semantic roles (`role="alertdialog"`) are provided for screen readers.
**Action:** When creating confirmation modals for destructive changes, always use `AlertDialog` and `buttonVariants` for consistent action button styling.
