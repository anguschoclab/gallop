## 2025-02-28 - Removed type assertions in RecruitmentPool
**Learning:** Components occasionally use inline module imports in their prop signatures which then forces `as unknown as import(...)` assertions downstream instead of simply importing the type statically.
**Action:** Import types explicitly at the top of the file to remove inline dynamic type inferences, preventing the need for casting and allowing TypeScript to naturally infer function parameters.
