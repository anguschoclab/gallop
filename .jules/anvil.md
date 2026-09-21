## 2024-05-16 - Prevent bypassing branded type indexing in Records
**Learning:** Using `as any` to index branded Records (e.g. `Record<OwnerKey, number>`) bypasses type safety and masks potential mismatches.
**Action:** Always use the appropriate branded casting function (e.g., `asOwnerKey`) when looking up values with raw string keys at system boundaries.
