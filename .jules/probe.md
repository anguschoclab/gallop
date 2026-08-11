## 2024-08-11 - Tests for grading module
**Learning:** Found an untested pure function module `scoutGrade` in `src/core/horse/grading.ts` that maps scores (0-100) to scout letter grades ("S", "A+", etc.) and its related `gradeColorClass`.
**Action:** Added targeted test file `src/tests/core/horse/grading.test.ts` to solidify boundaries for stats thresholds preventing silent regression on UI displays.
