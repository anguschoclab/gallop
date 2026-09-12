## 2024-10-24 - Testing Awards Eligibility
**Learning:** Core awards scoring engine `isEligibleForCategory` had untested complex conditionals evaluating age, gender, distance, and surface attributes to correctly map horses to regional awards.
**Action:** Added dedicated unit tests targeting the pure function `calculateAwardPoints` to independently verify the various eligibility boundaries and restrictions.
