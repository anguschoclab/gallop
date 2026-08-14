import type { NarrativeEvent, CommentaryLine } from "./types";
import { NARRATIVE_THRESHOLDS } from "@/constants/narrativeThresholds";
import type { RunnerConditionId } from "@/core/race/runnerConditions";

/**
 * Holds all mutable tracking state for a single race commentary session.
 *
 * Separating this from NarrativeGenerator keeps the orchestrator focused on
 * event detection and line creation, while this class owns the lifecycle of
 * cooldowns, history, flags, and counters.
 */
export class NarrativeState {
  readonly commentary: CommentaryLine[] = [];
  readonly cooldowns: Map<string, number> = new Map();
  readonly announcedMilestones: Set<number> = new Set();
  readonly hasAnnouncedBio: Set<string> = new Set();
  readonly lastRanks: Map<string, number> = new Map();

  lineCounter = 0;
  hasAnnouncedStart = false;
  hasAnnouncedFinish = false;
  hasAnnouncedStretch = false;
  lastLeaderId: string | null = null;
  readonly activeConditions: Map<string, Set<RunnerConditionId>> = new Map();
  readonly peakVelocities: Map<string, number> = new Map();

  /**
   * Check if a specific event type can be announced (cooldown check).
   *
   * @param type - Narrative event type
   * @param key - Context key (e.g. horse ID or "global")
   * @param simTime - Current simulation time in seconds
   * @param defaultCooldown - Cooldown duration in seconds
   * @returns True if the event can be announced
   */
  canAnnounce(
    type: NarrativeEvent,
    key: string,
    simTime: number,
    defaultCooldown: number = NARRATIVE_THRESHOLDS.DEFAULT_COOLDOWN,
  ): boolean {
    const cooldownKey = `${type}:${key}`;
    const expiry = this.cooldowns.get(cooldownKey) ?? 0;
    return simTime >= expiry;
  }

  /**
   * Set a cooldown for a specific event type and context key.
   *
   * @param type - Narrative event type
   * @param key - Context key (e.g. horse ID or "global")
   * @param simTime - Current simulation time in seconds
   * @param seconds - Cooldown duration in seconds
   */
  setCooldown(type: NarrativeEvent, key: string, simTime: number, seconds: number): void {
    this.cooldowns.set(`${type}:${key}`, simTime + seconds);
  }

  /**
   * Append one or more commentary lines to the history and the active queue.
   *
   * @param lines - One or more CommentaryLine objects to push
   */
  push(...lines: CommentaryLine[]): void {
    this.commentary.push(...lines);
  }

  /**
   * Return and post-increment the line counter, for use in ID generation.
   *
   * @returns The current counter value before incrementing
   */
  nextId(): number {
    return this.lineCounter++;
  }

  /**
   * Get the full commentary history for the race.
   *
   * @returns Array of all generated CommentaryLine objects
   */
  getCommentary(): CommentaryLine[] {
    return this.commentary;
  }

  setActiveConditions(horseId: string, ids: Set<RunnerConditionId>): void {
    this.activeConditions.set(horseId, new Set(ids));
  }

  getActiveConditions(horseId: string): Set<RunnerConditionId> {
    return this.activeConditions.get(horseId) ?? new Set();
  }

  updatePeakVelocity(horseId: string, velocity: number): void {
    const current = this.peakVelocities.get(horseId) ?? 0;
    if (velocity > current) {
      this.peakVelocities.set(horseId, velocity);
    }
  }
}
