## 2024-10-18 - Standardized Handlers
**Learning:** Some older impact handlers (`DiplomacyHandler` and `InboxHandler`) implemented the impact dispatch routing manually (`if (type === 'x') { ... }`), whereas all other handlers used a consistent `IMPACT_HANDLERS` dictionary approach mapping intent types to handler functions.
**Action:** Always search for variations in how parallel architectural elements are constructed and standardize them to follow the codebase's prevailing scalable patterns to avoid duplicated logical structures.
