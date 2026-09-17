## 2024-05-18 - Forged Player Syndicate Stakes Indexing

**Learning:** When indexing `Record<OwnerKey, number>` (like `shareHolders` or `shareholderSatisfaction`) using a string parameter (`playerStableId`), it was previously bypassed using `as any` rather than properly casting to the branded key (`asOwnerKey(playerStableId)`). This masked the potential for undefined indexing and lost the domain-specific type constraint.

**Action:** Replaced `(satRecord as any)[playerStableId]` and `(syn.shareHolders as any)?.[playerStableId]` with `satRecord[asOwnerKey(playerStableId)]` and `syn.shareHolders?.[asOwnerKey(playerStableId)]`. Also added explicit number types to array reductions when extracting values from the satisfaction record object.
