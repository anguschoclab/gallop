## 2025-03-01 - Strengthen TransportIntent type
**Learning:** `transportSlice.ts` was manually building a TransportIntent and casting it `as any` when enqueueing because `TransportIntent` was missing from `src/core/resolver/intents.ts` and the `AnyIntent` union. This bypassed type-checking entirely and could lead to silent bugs if the intent structure changed.
**Action:** Always define a strict interface extending `Intent` and include it in the `AnyIntent` union before enqueueing it in a slice, eliminating the need for `as any`.
