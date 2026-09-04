## 2024-05-18 - Enforcing strict types in `HQOpsWidget`
**Learning:** `Object.entries(facilities).map(([key, f]: [string, any]) => ...)` used `any` for the facility iteration, completely bypassing TypeScript's knowledge of the `Facility` type which led to using `f?.rank` which is not a valid property on `Facility` (it should have been `f?.level`).
**Action:** Removed the `[string, any]` type assertion in the `.map()` callback and relied on inference instead, replacing `f?.rank` with logic mapping `f?.level` to a number.
