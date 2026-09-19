1. The CI failed because of a layering violation in `src/components/stable/NpcCareerTrackerPanel.tsx`. It imports directly from `@/core/npc/careerTracker` and `@/core/horse/types`.
2. To fix this, I need to add `summarizeNpcCareer`, `careerStageLabel` and `NpcCareerStage` to the `src/services/npc/npcFacade.ts` or `src/services/horse/horseFacade.ts` respectively, or update the imports if they're already exported elsewhere.
3. I'll export `summarizeNpcCareer` and `careerStageLabel` from `src/services/npc/npcFacade.ts` using `replace_with_git_merge_diff`.
4. `NpcCareerStage` is already part of `src/core/horse/types.ts`, which is exported entirely in `src/services/horse/horseFacade.ts`.
5. Update the imports in `src/components/stable/NpcCareerTrackerPanel.tsx`.
6. Run `bun run lint` to verify.
7. Submit the changes.
