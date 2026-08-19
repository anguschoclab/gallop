## 2025-02-14 - Expanding Flavor Stories Variety
**Learning:** The flavor story generator relied on very small thematic pools (often <10 entries) and tests had brittle length assertions (e.g., exactly 41 items).
**Action:** Always refactor brittle array length assertions in tests to use dynamic calculations before adding static content to tables to avoid breaking tests. Added content variations across all six themes.
