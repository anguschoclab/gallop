import type { PipelineContext } from "../pipeline";
import { createExpense } from "@/core/expenses";
import { createTransaction } from "@/core/transactions";
import { calculateTotalMaintenance } from "@/core/facilities";

const UPKEEP_PER_HORSE = 50;

/**
 * Phase: Upkeep
 * Player pays $50/horse/day. NPC stables pay the same on their own roster
 * (closes the asymmetric drain that would have bankrupted them once foals,
 * stud fees, and purses started circulating). Player horses are excluded
 * from each NPC stable's count via stableId.
 */
export const upkeepPhase = {
  name: "upkeep",
  order: 20,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const playerHorses = state.horses.filter((h) => !h.stableId);
    const playerHorseCount = playerHorses.length;
    const playerUpkeep = playerHorseCount * UPKEEP_PER_HORSE;

    // Calculate facility maintenance costs
    const facilityMaintenance = state.facilities ? calculateTotalMaintenance(state.facilities) : 0;
    const totalDailyCost = playerUpkeep + facilityMaintenance;

    // Record expense entries for each horse
    const newExpenses = playerHorses.map((horse) =>
      createExpense("upkeep", UPKEEP_PER_HORSE, `Daily upkeep for ${horse.name}`, newDay, {
        horseId: horse.id,
        recurring: true,
      }),
    );

    // Record facility maintenance expense
    if (facilityMaintenance > 0) {
      newExpenses.push(
        createExpense(
          "facility_maintenance",
          facilityMaintenance,
          `Daily facility maintenance`,
          newDay,
          { recurring: true },
        ),
      );
    }

    // Record transaction entries for total upkeep (single transaction for the day)
    const newTransactions: typeof state.transactions = [];
    if (totalDailyCost > 0) {
      newTransactions.push(
        createTransaction(
          "expense",
          "upkeep",
          -totalDailyCost,
          `Daily upkeep: ${playerHorseCount} horse${playerHorseCount !== 1 ? "s" : ""} + facilities`,
          newDay,
          state.cash - totalDailyCost,
          { recurring: true },
        ),
      );
    }

    // Charge each NPC stable for its own horses.
    const npcStables = state.npcStables.map((stable) => {
      const owned = state.horses.filter((h) => h.stableId === stable.id);
      const cost = owned.length * UPKEEP_PER_HORSE;
      return { ...stable, cash: stable.cash - cost };
    });

    return {
      ...context,
      state: {
        ...state,
        cash: state.cash - totalDailyCost,
        npcStables,
        expenses: [...(state.expenses ?? []), ...newExpenses],
        transactions: [...(state.transactions ?? []), ...newTransactions],
      },
      logs: [...context.logs],
    };
  },
};
