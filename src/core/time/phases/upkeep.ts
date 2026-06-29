/**
 * phases/upkeep.ts - Upkeep phase
 *
 * This file provides the upkeep phase where player pays $50/horse/day and NPC stables
 * pay the same on their own roster to close asymmetric drain.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/expenses (createExpense), @/core/transactions (createTransaction), @/core/facilities (calculateTotalMaintenance), @/services/newsGenerator (generateFlavorNews), @/game/uuid (generateUUID), @/core/resolver/impacts/index (AnyImpact), @/core/ai/upkeepAI (calculateMonthlyExpenseBudget, shouldConserveCash, createUpkeepAIState, recordBudgetDecision, updateReserveState), @/core/ai/npcCycleAI (getOrCreateStableAIState), @/game/constants (UPKEEP_PER_HORSE)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import { createExpense } from "@/core/expenses";
import { createTransaction } from "@/core/transactions";
import { calculateTotalMaintenance } from "@/core/facilities";
import { generateFlavorNews } from "@/services/narrative/newsGenerator";
import { generateUUID } from "@/core/uuid";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import {
  calculateMonthlyExpenseBudget,
  shouldConserveCash,
  createUpkeepAIState,
  recordBudgetDecision,
  updateReserveState,
} from "@/core/ai/upkeepAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { UPKEEP_PER_HORSE, PHASE_ORDER_UPKEEP } from "@/constants";

/**
 * Phase: Upkeep
 * Player pays $50/horse/day. NPC stables pay the same on their own roster
 * (closes the asymmetric drain that would have bankrupted them once foals,
 * stud fees, and purses started circulating). Player horses are excluded
 * from each NPC stable's count via stableId.
 */
export const upkeepPhase = {
  name: "upkeep",
  order: PHASE_ORDER_UPKEEP,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, dailyRng } = context;
    const impacts: AnyImpact[] = [];

    const playerHorses = state.horses.filter(
      (h) => !h.stableId && (!h.lifecycleStatus || h.lifecycleStatus === "active"),
    );
    const playerHorseCount = playerHorses.length;
    const playerUpkeep = playerHorseCount * UPKEEP_PER_HORSE;

    // Calculate staff salaries for player
    const hiredStaff = state.hiredStaff ?? [];
    const playerStaff = hiredStaff.filter((s) => s.stableId === "");
    const playerStaffSalaries = playerStaff.reduce((sum, s) => sum + s.salary, 0);

    const facilityMaintenance = state.facilities ? calculateTotalMaintenance(state.facilities) : 0;
    const totalDailyCost = playerUpkeep + facilityMaintenance + playerStaffSalaries;

    // Record expense entries for each horse
    const newExpenses = playerHorses.map((horse) =>
      createExpense("upkeep", UPKEEP_PER_HORSE, `Daily upkeep for ${horse.name}`, newDay, {
        horseId: horse.id,
        recurring: true,
      }),
    );

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
    playerStaff.forEach((staff) => {
      newExpenses.push(
        createExpense("upkeep", staff.salary, `${staff.role} salary for ${staff.name}`, newDay, {
          recurring: true,
        }),
      );
    });

    // Emit impacts for player upkeep cash and transaction recording.
    if (totalDailyCost > 0) {
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: "",
        day: newDay,
        phase: "upkeep",
        logLevel: "conditional",
        type: "cash_change",
        entityId: "player",
        amount: -totalDailyCost,
        reason: `Daily upkeep: ${playerHorseCount} horses, facilities, and ${playerStaff.length} staff`,
      } as AnyImpact);
      impacts.push({
        id: generateUUID(dailyRng),
        intentId: "",
        day: newDay,
        phase: "upkeep",
        logLevel: "conditional",
        type: "transaction",
        amount: -totalDailyCost,
        category: "upkeep",
        description: `Daily upkeep: ${playerHorseCount} horses, facilities, and ${playerStaff.length} staff`,
        metadata: { recurring: true },
      } as AnyImpact);
    }

    // Pre-calculate counts and staff
    const horseCountsByStable = new Map<string, number>();
    for (const h of state.horses) {
      const isActive = !h.lifecycleStatus || h.lifecycleStatus === "active";
      if (h.stableId && isActive) {
        horseCountsByStable.set(h.stableId, (horseCountsByStable.get(h.stableId) ?? 0) + 1);
      }
    }

    const staffByStable = new Map<string, any[]>();
    if (state.hiredStaff) {
      for (const staff of state.hiredStaff) {
        const sid = staff.stableId ?? "";
        if (!staffByStable.has(sid)) staffByStable.set(sid, []);
        staffByStable.get(sid)!.push(staff);
      }
    }

    // Clone AI manager so upkeep learning updates do not mutate the original state.
    let npcAIManager = state.npcAIManager;
    if (npcAIManager) {
      npcAIManager = { ...npcAIManager, stableStates: { ...npcAIManager.stableStates } };
    }

    // Bankruptcy protection thresholds
    const BANKRUPTCY_THRESHOLD = -10000; // Allow some debt before intervention
    const BANKRUPTCY_INJECTION = 50000; // Cash injection amount
    const BANKRUPTCY_COOLDOWN_DAYS = 365; // One year between injections per stable

    // Calculate NPC upkeep costs and emit cash_change impacts.
    for (const stable of state.npcStables) {
      const aiState = npcAIManager
        ? getOrCreateStableAIState(npcAIManager, stable, newDay)
        : undefined;
      if (aiState && !aiState.upkeepAI) {
        aiState.upkeepAI = createUpkeepAIState(stable);
      }

      const ownedCount = horseCountsByStable.get(stable.id) ?? 0;
      const horseCost = ownedCount * UPKEEP_PER_HORSE;
      const stableStaff = staffByStable.get(stable.id) ?? [];
      const staffSalaries = stableStaff.reduce((sum, s) => sum + s.salary, 0);
      let actualCost = horseCost + staffSalaries;

      if (aiState) {
        const monthlyExpenses = actualCost * 30; // Estimate monthly expenses

        // Update reserve state based on current cash and expenses
        const updatedAIState = updateReserveState(
          aiState.upkeepAI!,
          stable,
          monthlyExpenses,
          newDay,
        );

        // Check if stable should conserve cash
        const shouldConserve = shouldConserveCash(updatedAIState, stable, monthlyExpenses);

        // If conserving cash and running low, reduce spending by not charging full upkeep
        if (shouldConserve && stable.cash < monthlyExpenses * 2) {
          actualCost = Math.floor(actualCost * 0.5);
        }

        // Record budget decision for AI learning
        aiState.upkeepAI = recordBudgetDecision(
          updatedAIState,
          monthlyExpenses,
          actualCost,
          { upkeep: actualCost },
          stable,
          newDay,
        );

        npcAIManager!.stableStates[stable.id] = aiState;
      }

      if (actualCost > 0) {
        impacts.push({
          id: generateUUID(dailyRng),
          intentId: "",
          day: newDay,
          phase: "upkeep",
          logLevel: "conditional",
          type: "cash_change",
          entityId: stable.id,
          amount: -actualCost,
          reason: "Daily NPC upkeep",
        } as AnyImpact);
      }

      // Bankruptcy protection: emit cash injection if projected cash falls below threshold.
      const projectedCash = stable.cash - actualCost;
      if (projectedCash < BANKRUPTCY_THRESHOLD) {
        const lastInjectionDay = stable.lastBankruptcyInjectionDay || 0;
        const daysSinceInjection = newDay - lastInjectionDay;

        if (daysSinceInjection >= BANKRUPTCY_COOLDOWN_DAYS) {
          impacts.push({
            id: generateUUID(dailyRng),
            intentId: "",
            day: newDay,
            phase: "upkeep",
            logLevel: "conditional",
            type: "cash_change",
            entityId: stable.id,
            amount: BANKRUPTCY_INJECTION,
            reason: "Bankruptcy protection cash injection",
          } as AnyImpact);
        }
      }
    }

    return {
      ...context,
      state: {
        ...state,
        npcAIManager,
        expenses: [...(state.expenses ?? []), ...newExpenses].slice(-1000), // Cap at 1000 entries
      },
      impacts: [
        ...context.impacts,
        ...impacts,
        ...(dailyRng.next() < 0.1
          ? [
              {
                id: generateUUID(dailyRng),
                intentId: "",
                day: newDay,
                phase: "upkeep",
                logLevel: "always",
                type: "news_item",
                newsItem: generateFlavorNews(newDay, dailyRng),
              } as AnyImpact,
            ]
          : []),
      ],
      logs: [...context.logs],
    };
  },
};
