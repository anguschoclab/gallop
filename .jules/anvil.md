## 2025-03-08 - Strengthen OwnerKey indexing in syndicate stakes
**Learning:** When indexing into a Record that uses a branded key type (like `Record<OwnerKey, number>`) with a raw string, avoid bypassing type safety using explicit `as any` casting.
**Action:** Instead, use the corresponding branded casting helper function from `@/core/types/branded` (e.g., `asOwnerKey(string)`) to cast the string to the correct key type.
