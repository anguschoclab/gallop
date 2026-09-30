## 2025-03-10 - Directive News Variety Gap

**Learning:** The directive news generator only had 8 templates for headlines and bodies, leading to staleness during long campaigns when multiple AI stables shift strategies or face financial distress. Any generator with fewer than ~8 templates risks breaking immersion through repetition.
**Action:** When inspecting narrative generators, always count the variants in template arrays. For systems like `directiveNewsGenerator.ts`, ensure at least 14 distinct templates exist per logical branch (e.g., standard shifts vs distress).
