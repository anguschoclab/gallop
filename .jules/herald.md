## 2024-11-20 - Narrative Variety in Directive Changes
**Learning:** The directiveNewsGenerator only hardcoded one template variation, causing identical text across many AI strategy changes.
**Action:** I expanded the variation from 1 to 16, breaking it down into distinct thematic arrays based on standard vs distress changes, maintaining RNG determinism via `rng.pick()`.
