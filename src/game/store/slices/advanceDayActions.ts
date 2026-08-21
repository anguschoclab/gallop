import { applyPatches } from "immer";
import type { Horse, Race } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import { executePipeline } from "@/core/time/pipeline";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
import { createRng, hashStr } from "@/core/common/rng";
import { getCurrentYear } from "@/core/race/schedule";
import { computePlayerRaceDays } from "@/core/time/advance";
import { UPKEEP_PER_HORSE, DAYS_PER_YEAR, DAYS_PER_MONTH, DAYS_PER_WEEK } from "@/constants";
import { getEngineWorker } from "@/game/store";
import { persistenceEnabled } from "@/game/store/storage";
import { clearLineageCache } from "@/core/breeding/lineage";
import type { StoreSet, StoreGet, StoreType } from "../types";
import type { CoreSlice } from "./coreSlice";
import { isPlayerOwned } from "@/core/horse/ownership";

export function createAdvanceDayActions(
  set: StoreSet,
  get: StoreGet,
): Pick<
  CoreSlice,
  "advanceDay" | "advanceMultipleDays" | "advanceWeek" | "advanceMonth" | "advanceYear"
> {
  const applyDayResult = (
    finalState: Partial<StoreType>,
    newLogs: { day: number; text: string }[],
    playerUpkeep: number,
    newDay: number,
  ) => {
    const s = get();

    const overrides = {
      day: newDay,
      pendingIntents: [],
      trainingUsed: {},
      log: [
        ...newLogs,
        { day: newDay, text: `Day ${newDay} begins. Upkeep: $${playerUpkeep}.` },
        ...s.log,
      ].slice(0, 1000),
    };

    const update: Record<string, unknown> = { ...finalState, ...overrides };

    delete update.lastFrameTime;
    delete update.isAdvancing;

    clearLineageCache();
    set(update as Partial<StoreType>);
  };

  return {
    advanceDay: async (progressCallback?: (stage: number, total: number, name: string) => void) => {
      const s = get();
      const newDay = s.day + 1;
      const currentYear = getCurrentYear(newDay);
      const previousYear = getCurrentYear(s.day);

      let horses = s.horses;
      if (currentYear > previousYear) {
        horses = Object.fromEntries(
          Object.values(s.horses).map((h: Horse) => {
            if (h.winAndYouInQualified) {
              return [
                h.id,
                {
                  ...h,
                  winAndYouInQualified: h.winAndYouInQualified.filter((q) => q.year >= currentYear),
                },
              ];
            }
            return [h.id, h];
          }),
        );
      }

      const playerHorseCount = Object.values(horses).filter((h: Horse) => isPlayerOwned(h)).length;
      const playerUpkeep = playerHorseCount * UPKEEP_PER_HORSE;

      try {
        const engineWorker = getEngineWorker();
        const result = await engineWorker.advanceDay({
          state: { ...s, horses },
          newDay,
          progressCallback,
        });

        const { patches, logs: newLogs } = result;
        const finalState = applyPatches(s, patches);
        applyDayResult(finalState, newLogs, playerUpkeep, newDay);
      } catch (error) {
        if (!(error instanceof Error && error.message.includes("Worker not available"))) {
          console.warn(
            "Worker not available or failed to clone state, using synchronous pipeline execution",
          );
        }

        const syncState = {
          ...s,
          horses,
          npcAIManager: s.npcAIManager
            ? {
                ...s.npcAIManager,
                stableStates: { ...s.npcAIManager.stableStates },
              }
            : undefined,
        };
        const pipelineContext: PipelineContext = {
          previousDay: s.day,
          newDay,
          state: syncState,
          logs: [],
          dailyRng: createRng(hashStr("daily_" + newDay)),
          intents: s.pendingIntents || [],
          impacts: [],
          impactLog: [],
          horseMap: new Map(Object.values(syncState.horses).map((h: Horse) => [h.id, h])),
          raceMap: new Map(Object.values(syncState.races).map((r: Race) => [r.id, r])),
          stableMap: new Map((syncState.npcStables ?? []).map((s) => [s.id, s])),
          jockeyMap: new Map((syncState.jockeys ?? []).map((j) => [j.id, j])),
        };

        const updatedContext = executePipeline(GAME_PIPELINE_PHASES, pipelineContext);
        const { state: finalState, logs: newLogs } = updatedContext;
        applyDayResult(finalState, newLogs, playerUpkeep, newDay);
      }
    },

    advanceMultipleDays: async (n: number, headless?: boolean) => {
      const s = get();
      const playerRaceDays = computePlayerRaceDays(Object.values(s.races), s.day + 1, s.day + n);

      const wasPersistenceEnabled = persistenceEnabled.value;
      persistenceEnabled.value = false;

      try {
        try {
          const engineWorker = getEngineWorker();
          const result = await engineWorker.advanceDaysBatch({
            state: { ...s },
            count: n,
            headless,
            playerRaceDays,
          });

          const {
            patches,
            logs: allLogs,
            daysAdvanced,
            encounteredPlayerRace,
            playerRaceId,
          } = result;

          const finalState = applyPatches(s, patches);
          const finalDay = s.day + daysAdvanced;

          const playerHorseCount = Object.values(finalState.horses ?? {}).filter((h: Horse) =>
            isPlayerOwned(h),
          ).length;
          const playerUpkeep = playerHorseCount * UPKEEP_PER_HORSE;

          applyDayResult(finalState, allLogs, playerUpkeep, finalDay);

          if (encounteredPlayerRace && playerRaceId) {
            set({ pendingPlayerRaceId: playerRaceId });
          }
          return;
        } catch (error) {
          if (!(error instanceof Error && error.message.includes("Worker not available"))) {
            console.warn(
              "Worker batch not available, using synchronous per-day pipeline execution",
            );
          }
        }

        const batchSize = 5;

        for (let i = 0; i < n; i++) {
          const currentS = get();
          const nextDay = currentS.day + 1;

          if (playerRaceDays.has(nextDay) && !headless) {
            const playerRace = Object.values(currentS.races).find(
              (r: Race) => !r.resolved && r.day === nextDay && r.entries.some((e) => e.owned),
            );
            if (playerRace) {
              set({ pendingPlayerRaceId: playerRace.id });
              return;
            }
          }

          await get().advanceDay();

          if (i % batchSize === 0 && i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
      } finally {
        persistenceEnabled.value = wasPersistenceEnabled;
      }
    },

    advanceWeek: async (headless?: boolean) => {
      await get().advanceMultipleDays(DAYS_PER_WEEK, headless);
    },

    advanceMonth: async (headless?: boolean) => {
      await get().advanceMultipleDays(DAYS_PER_MONTH, headless);
    },

    advanceYear: async (headless?: boolean) => {
      await get().advanceMultipleDays(DAYS_PER_YEAR, headless);
    },
  };
}
