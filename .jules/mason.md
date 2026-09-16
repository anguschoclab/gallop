## 2024-05-25 - Deduplicate CONTINENT_TO_REGION in awards
**Learning:** Found multiple identical lookup dictionaries (`CONTINENT_TO_REGION`) in `invitations.ts` and `scoring.ts` that mapped continent domains to award regions, causing a potential maintenance vulnerability.
**Action:** Extract structural lookup constants to their domain's `types.ts` module to serve as the single source of truth across sibling files in that domain.
