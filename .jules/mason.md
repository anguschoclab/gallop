## 2025-02-23 - Deduplicated Resolver Handlers
**Learning:** Found massive duplication in the `canHandle` methods across all resolver handlers in `src/core/resolver/handlers/`. Each handler maintained a hardcoded array of supported impact types which exactly duplicated the keys of the `IMPACT_HANDLERS` dictionary in the same file. This is a recurring source of bugs when new impacts are added but the handler is forgotten.
**Action:** Replaced the hardcoded arrays with a dynamic `type in IMPACT_HANDLERS` lookup.
