## 2024-05-18 - Remove 'as any' casting for OwnerKey lookup
**Learning:** Explicit `as any` casting was used in `src/core/breeding/syndicateStakes.ts` to bypass `Record<OwnerKey, number>` lookups with a raw `string` (`playerStableId`). This defeats the purpose of the branded `OwnerKey` type and masks potential domain logic errors if a non-OwnerKey string is accidentally passed.
**Action:** Use proper `asOwnerKey()` branded type casting instead of `as any` for indexing into `OwnerKey` typed dictionaries to maintain type integrity.
