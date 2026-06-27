## 2024-05-18 - Optimize StaffSupportPanel lookups
**Learning:** When trying to eliminate consecutive `.find()` lookups over filtered arrays using a `Map`, beware of inline array filters (like `.filter() ?? []`) creating unstable references. Using an unstable array as a dependency in `useMemo` invalidates the cache on every render, resulting in worse performance due to object allocation overhead.
**Action:** Compute the filter *and* the HashMap in a single pass inside a `useMemo` that depends on stable source objects (e.g. `hiredStaff` and `stableId`) to avoid unstable reference invalidation.
