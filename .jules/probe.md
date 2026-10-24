## 2025-02-14 - Pedigree Graph Testing
**Learning:** The graph traversal logic for pedigrees (`buildPedigreeGraph`) handles missing parent IDs by generating deterministic "phantom" nodes using name hashes, which wasn't fully obvious without reading the full logic.
**Action:** Ensure tests for recursive graph generation explicitly cover all branch logic (real parents, named but missing IDs, completely unknown parents) to lock in tree structure expectations.
