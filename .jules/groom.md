## 2024-05-18 - [Add clear disabled state explanations to compare checkboxes]
**Learning:** Found a recurring gap where disabled checkboxes (like when the comparison limit is reached) had no visual feedback or explanation for why they were disabled, leaving users confused.
**Action:** Used the `DisabledTooltipWrapper` to wrap disabled checkboxes in list/gallery views when limits are reached, following the repo's existing pattern for disabled state explanations.
