## 2024-09-04 - Replace native confirm dialogs with AlertDialog
**Learning:** The application uses a robust Radix-based `AlertDialog` component that handles focus management and screen reader announcements properly. Native `confirm()` dialogs are jarring and block the UI thread, creating a poor user experience.
**Action:** When creating destructive actions, default to using the repository's `AlertDialog` primitives rather than falling back to `window.confirm`.
