## 2025-03-09 - Missing Test Coverage for Core Financial Logic
**Learning:** The `expenses` module (specifically `expenseTypes.ts`) handles core financial math for categorized expense tracking, but was completely untested and lacked a test directory. Core business logic like currency math and filtering can easily silently regress.
**Action:** Prioritize checking new or structurally isolated subdirectories in `src/core/` for missing mirror directories in `src/tests/core/` to uncover completely untested foundational modules.
