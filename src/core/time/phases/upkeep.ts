import type { PipelineContext } from "../pipeline";
import { createExpense } from "@/core/expenses";
import { createTransaction } from "@/core/transactions";
import { calculateTotalMaintenance } from "@/core/facilities";
import { generateFlavorNews } from "@/services/newsGenerator";
import { generateUUID } from "@/game/uuid";
import type { AnyImpact } from "@/core/resolver/impacts";
import {
  calculateMonthlyExpenseBudget,
  shouldConserveCash,
  createUpkeepAIState,
  recordBudgetDecision,
  updateReserveState,
} from "@/core/ai/upkeepAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { UPKEEP_PER_HORSE } from "@/game/constants/gameConstants";

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
    const playerHorses = state.horses.filter((h) => !h.stableId && h.lifecycleStatus === "active");
    const playerHorseCount = playerHorses.length;
    const playerUpkeep = playerHorseCount * UPKEEP_PER_HORSE;

    // Calculate staff salaries for player
    const hiredStaff = state.hiredStaff ?? [];
    const playerStaff = hiredStaff.filter(s => s.stableId === "");
    const playerStaffSalaries = playerStaff.reduce((sum, s) => sum + s.salary, 0);

    const totalDailyCost = playerUpkeep + facilityMaintenance + playerStaffSalaries;

    // Record expense entries for each horse
    const newExpenses = playerHorses.map((horse) =>
      createExpense("upkeep", UPKEEP_PER_HORSE, `Daily upkeep for ${horse.name}`, newDay, {
        horseId: horse.id,
        recurring: true,
      }),
    );

    // Record facility maintenance expense
    const facilityMaintenance = state.facilities ? calculateTotalMaintenance(state.facilities) : 0;
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

    // Record staff salary expenses
    playerStaff.forEach(staff => {
      newExpenses.push(
        createExpense(
          "staff_salary",
          staff.salary,
          `${staff.role} salary for ${staff.name}`,
          newDay,
          { recurring: true }
        )
      );
    });

    // Record transaction entries for total upkeep (single transaction for the day)
    const newTransactions: typeof state.transactions = [];
    if (totalDailyCost > 0) {
      newTransactions.push(
        createTransaction(
          "expense",
          "upkeep",
          -totalDailyCost,
          `Daily upkeep: ${playerHorseCount} horses, facilities, and ${playerStaff.length} staff`,
          newDay,
          state.cash - totalDailyCost,
          { recurring: true },
        ),
      );
    }

    // Charge each NPC stable for its own horses.
    let npcStables = state.npcStables;
    if (state.npcAIManager) {
      const aiManager = state.npcAIManager; // Capture to satisfy TypeScript
      // Ensure stableStates is a Map (it may have been serialized to an object)
      if (!(aiManager.stableStates instanceof Map)) {
        aiManager.stableStates = new Map(Object.entries(aiManager.stableStates || {}));
      }
      npcStables = state.npcStables.map((stable) => {
        const aiState = getOrCreateStableAIState(aiManager, stable, newDay);
        if (!aiState.upkeepAI) {
          aiState.upkeepAI = createUpkeepAIState(stable);
        }

        const owned = state.horses.filter((h) => h.stableId === stable.id);
        const horseCost = owned.length * UPKEEP_PER_HORSE;
        
        const stableStaff = hiredStaff.filter(s => s.stableId === stable.id);
        const staffSalaries = stableStaff.reduce((sum, s) => sum + s.salary, 0);
        
        const cost = horseCost + staffSalaries;
        const monthlyExpenses = cost * 30; // Estimate monthly expenses

        // Update reserve state based on current cash and expenses
        const updatedAIState = updateReserveState(
          aiState.upkeepAI,
          stable,
          monthlyExpenses,
          newDay,
        );

        // Check if stable should conserve cash
        const shouldConserve = shouldConserveCash(updatedAIState, stable, monthlyExpenses);

        // If conserving cash and running low, reduce spending by not charging full upkeep
        let actualCost = cost;
        if (shouldConserve && stable.cash < monthlyExpenses * 2) {
          // Reduce upkeep by 50% when conserving and low on cash
          actualCost = Math.floor(cost * 0.5);
        }

        // Record budget decision for AI learning
        recordBudgetDecision(
          updatedAIState,
          monthlyExpenses,
          actualCost,
          { upkeep: actualCost },
          stable,
          newDay,
        );

        return { ...stable, cash: stable.cash - actualCost };
      });
    } else {
      npcStables = state.npcStables.map((stable) => {
        const owned = state.horses.filter((h) => h.stableId === stable.id);
        const cost = owned.length * UPKEEP_PER_HORSE;
        return { ...stable, cash: stable.cash - cost };
      });
    }

    return {
      ...context,
      state: {
        ...state,
        cash: state.cash - totalDailyCost,
        npcStables,
        expenses: [...(state.expenses ?? []), ...newExpenses],
        transactions: [...(state.transactions ?? []), ...newTransactions],
      },
      impacts: [
        ...(context.impacts || []),
        ...((Math.random() < 0.1) ? [{
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "upkeep",
          logLevel: "always",
          type: "news_item",
          newsItem: generateFlavorNews(newDay),
        } as AnyImpact] : [])
      ],
      logs: [...context.logs],
    };
  },
};
