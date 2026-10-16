## 2024-10-16 - Add confirmation dialog to destructive action (Selling a horse)
**Learning:** Players could accidentally sell a horse with a single click. Destructive actions that change the state significantly or lose an asset should require confirmation, especially when no undo is available.
**Action:** When adding actions that sell, retire, or permanently alter a horse or major asset, wrap the action in an `AlertDialog` so the player has a chance to cancel.
