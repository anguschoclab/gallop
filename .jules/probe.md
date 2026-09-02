## 2025-03-02 - Testing regional logic with strict track data
**Learning:** `findInvitationQualifiers` relies heavily on `TRACK_TO_COUNTRY` mappings to resolve regions. Testing it requires using actual track names from the dataset (like "Woodbine" or "Ascot") rather than arbitrary strings, otherwise valid performances are silently filtered out.
**Action:** When testing geographical or regional features, always reference `TRACK_TO_COUNTRY` or provide valid mock track strings to ensure correct continent resolution.
