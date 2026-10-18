## 2024-10-18 - Type strictness in domain entities
**Learning:** `HorseId` and `StableId` are branded types, but arrays mapping and lookups in the domains frequently assert them `as string` (e.g. `[horse.id as string, horse]`). However, TypeScript correctly handles `HorseId` and `StableId` when setting them as Map keys since they are aliases for `string`.
**Action:** Remove `as string` assertions from `HorseId` and `StableId` accesses to allow TypeScript to natively verify contracts, preserving types and reducing runtime vulnerability to mistyped IDs.
