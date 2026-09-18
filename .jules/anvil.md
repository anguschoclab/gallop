## 2025-03-05 - Branded Key Indexing
**Learning:** Indexing records keyed with a branded type like `Record<OwnerKey, T>` using explicit `as any` bypasses the type-checker and masks type assumptions.
**Action:** Always cast string variables using the designated branded constructor function (e.g., `asOwnerKey(string)`) rather than bypassing type safety with `any`.
