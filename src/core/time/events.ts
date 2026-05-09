/**
 * events.ts - Event registry and triggers
 *
 * This file provides an event registry for day-of-year, interval, and conditional triggers
 * that execute handlers during day advancement.
 *
 * Dependencies: @/game/types (GameState), ./pipeline (PipelineContext)
 * Related files: pipeline.ts (uses event registry), phases/ (phases register events)
 */

import type { GameState } from "@/game/types";
import type { PipelineContext } from "./pipeline";

export interface EventTrigger {
  id: string;
  type: "day_of_year" | "interval" | "condition";
  condition: (day: number, state: GameState) => boolean;
  handler: (context: PipelineContext) => void;
  priority: number;
}

class EventRegistry {
  private triggers: EventTrigger[] = [];

  /**
   * Register a new event trigger and maintain priority order.
   *
   * @param trigger - The event trigger definition to register
   */
  register(trigger: EventTrigger): void {
    this.triggers.push(trigger);
    // Sort by priority (higher priority first)
    this.triggers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unregister an event trigger by its unique ID.
   *
   * @param id - The ID of the trigger to remove
   */
  unregister(id: string): void {
    this.triggers = this.triggers.filter((t) => t.id !== id);
  }

  /**
   * Get all triggers that satisfy their conditions for a given day and state.
   *
   * @param day - Current game day
   * @param state - Current game state
   * @returns Array of active triggers
   */
  getTriggers(day: number, state: GameState): EventTrigger[] {
    return this.triggers.filter((t) => t.condition(day, state));
  }

  /**
   * Execute all active triggers for the current pipeline context.
   *
   * @param context - Pipeline context containing current state and day
   */
  executeTriggers(context: PipelineContext): void {
    const triggers = this.getTriggers(context.newDay, context.state);
    for (const trigger of triggers) {
      trigger.handler(context);
    }
  }
}

export const eventRegistry = new EventRegistry();

/**
 * Helper to create a day-of-year trigger.
 *
 * @param id - Unique identifier for the trigger
 * @param dayOfYear - Day of the year (1-365) to trigger on
 * @param handler - Function to execute when triggered
 * @param priority - Execution priority (higher runs first, defaults to 50)
 * @returns EventTrigger object
 */
export function createDayOfYearTrigger(
  id: string,
  dayOfYear: number,
  handler: (context: PipelineContext) => void,
  priority: number = 50,
): EventTrigger {
  return {
    id,
    type: "day_of_year",
    condition: (day) => ((day - 1) % 365) + 1 === dayOfYear,
    handler,
    priority,
  };
}

/**
 * Helper to create an interval trigger (every N days).
 *
 * @param id - Unique identifier for the trigger
 * @param intervalDays - Number of days between executions
 * @param startDay - The first day to start the interval from
 * @param handler - Function to execute when triggered
 * @param priority - Execution priority (defaults to 50)
 * @returns EventTrigger object
 */
export function createIntervalTrigger(
  id: string,
  intervalDays: number,
  startDay: number,
  handler: (context: PipelineContext) => void,
  priority: number = 50,
): EventTrigger {
  return {
    id,
    type: "interval",
    condition: (day) => day >= startDay && (day - startDay) % intervalDays === 0,
    handler,
    priority,
  };
}

/**
 * Helper to create a custom condition trigger.
 *
 * @param id - Unique identifier for the trigger
 * @param condition - Predicate function that determines if trigger runs
 * @param handler - Function to execute when triggered
 * @param priority - Execution priority (defaults to 50)
 * @returns EventTrigger object
 */
export function createConditionTrigger(
  id: string,
  condition: (day: number, state: GameState) => boolean,
  handler: (context: PipelineContext) => void,
  priority: number = 50,
): EventTrigger {
  return {
    id,
    type: "condition",
    condition,
    handler,
    priority,
  };
}
