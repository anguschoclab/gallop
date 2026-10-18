## 2025-02-23 - Standardizing handler routing
**Learning:** Some newer handlers (InboxHandler, DiplomacyHandler) used inline switch/ifs or hardcoded type checks instead of the standard IMPACT_HANDLERS dictionary dispatch pattern found across the rest of the codebase.
**Action:** Always use dynamic dictionary lookup in handlers (`canHandle` using `Object.hasOwn(IMPACT_HANDLERS, type)` and `const IMPACT_HANDLERS: Record<string, ImpactHandlerFunction> = ...` for dispatch). This avoids prototype injection vulnerabilities and ensures ImpactHandlerFunction is imported.
