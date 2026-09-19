## 2025-02-23 - Branded Key Record Indexing
**Learning:** Bypassing branded type keys in dictionaries using `(object as any)[unbrandedKey]` is an anti-pattern that circumvents type safety for the entire dictionary lookup.
**Action:** Always use the corresponding branded casting function (e.g., `asOwnerKey(unbrandedKey)`) to cast the key before indexing, preserving the type safety of the returned value.
