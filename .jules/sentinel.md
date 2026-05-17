## 2024-05-16 - [crypto.randomUUID Insecure Environment Failure Risk]
**Vulnerability:** Native `crypto.randomUUID()` was used directly in several core type definition files (e.g., `replayTypes.ts`, `expenseTypes.ts`).
**Learning:** In non-secure contexts (e.g. non-HTTPS, certain local environments or older browsers), `crypto.randomUUID` is undefined, leading to crashes. A centralized `generateUUID()` function exists in `src/core/uuid.ts` with proper fallbacks.
**Prevention:** Always use the centralized `generateUUID()` from `@/core/uuid` (or relative paths) instead of directly calling `crypto.randomUUID()` to ensure UUID generation works consistently across all environments.
