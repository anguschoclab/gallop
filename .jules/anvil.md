## 2026-09-11 - Type-only re-exports in TypeScript
**Learning:** When re-exporting a type from a module (like `RaceClass` from `sharedTypes.ts`), using `export { RaceClass }` instead of `export type { RaceClass }` causes Vite/Rolldown builds to fail with `MISSING_EXPORT` errors because the bundler thinks it should be a runtime value, not just a compile-time type.
**Action:** Always use `export type { X }` when re-exporting interfaces or types to ensure bundlers strip them correctly during transpilation.
