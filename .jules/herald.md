## 2024-03-24 - Conditional Race Flavor Expansion
**Learning:** The `addConditionalRaceFlavor` logic was heavily starved of variety (only 1-2 options per condition) and ignored several weather states entirely, leading to highly repetitive news items in long saves.
**Action:** Significantly expanded the flavor variants (5-6 per condition) and added handling for all missing weather conditions to ensure the generated race news remains fresh and contextually accurate.
