import type { GameState } from "@/game/types";
import type { PipelineContext } from "./pipeline";

export interface EventTrigger {
  id: string;
  type: 'day_of_year' | 'interval' | 'condition';
  condition: (day: number, state: GameState) => boolean;
  handler: (context: PipelineContext) => void;
  priority: number;
}

class EventRegistry {
  private triggers: EventTrigger[] = [];

  register(trigger: EventTrigger): void {
    this.triggers.push(trigger);
    // Sort by priority (higher priority first)
    this.triggers.sort((a, b) => b.priority - a.priority);
  }

  unregister(id: string): void {
    this.triggers = this.triggers.filter(t => t.id !== id);
  }

  getTriggers(day: number, state: GameState): EventTrigger[] {
    return this.triggers.filter(t => t.condition(day, state));
  }

  executeTriggers(context: PipelineContext): void {
    const triggers = this.getTriggers(context.newDay, context.state);
    for (const trigger of triggers) {
      trigger.handler(context);
    }
  }
}

export const eventRegistry = new EventRegistry();

/**
 * Helper to create a day-of-year trigger
 */
export function createDayOfYearTrigger(
  id: string,
  dayOfYear: number,
  handler: (context: PipelineContext) => void,
  priority: number = 50
): EventTrigger {
  return {
    id,
    type: 'day_of_year',
    condition: (day) => ((day - 1) % 365) + 1 === dayOfYear,
    handler,
    priority,
  };
}

/**
 * Helper to create an interval trigger (every N days)
 */
export function createIntervalTrigger(
  id: string,
  intervalDays: number,
  startDay: number,
  handler: (context: PipelineContext) => void,
  priority: number = 50
): EventTrigger {
  return {
    id,
    type: 'interval',
    condition: (day) => day >= startDay && (day - startDay) % intervalDays === 0,
    handler,
    priority,
  };
}

/**
 * Helper to create a custom condition trigger
 */
export function createConditionTrigger(
  id: string,
  condition: (day: number, state: GameState) => boolean,
  handler: (context: PipelineContext) => void,
  priority: number = 50
): EventTrigger {
  return {
    id,
    type: 'condition',
    condition,
    handler,
    priority,
  };
}
