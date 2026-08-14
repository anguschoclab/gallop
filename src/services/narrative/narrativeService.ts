import type { Runner } from "@/core/race/engine/runnerBuilder";
import { computePaceContext } from "@/core/race/engine/simulation";
import type { Horse, Race, Stable } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import type { NarrativeEvent, CommentaryLine } from "./types";
import { generateCommentaryLine, generateExpertInsight } from "./commentaryGenerator";
import {
  detectLeadChange,
  detectPositionChange,
  detectDrafting,
  detectLaneWatch,
  detectGapAnnouncement,
  detectStretch,
  detectFinish,
  detectStableWatch,
  detectAtmosphere,
} from "./eventDetector";
import { NARRATIVE_THRESHOLDS } from "@/constants/narrativeThresholds";
import {
  CONDITION_TO_EVENT,
  CONDITION_COOLDOWN,
  TONE_PRIORITY,
  HIGH_IMPACT_CONDITIONS,
} from "@/constants/narrativeConditionConstants";
import { NarrativeState } from "./narrativeState";
import { buildFieldContext, deriveRunnerConditions } from "@/core/race/runnerConditions";
import type {
  RunnerConditionId,
  RunnerHistory,
  RunnerCondition,
} from "@/core/race/runnerConditions";

/**
 * Orchestrates real-time race commentary generation.
 *
 * This class tracks race state, detects significant events (lead changes, surges, fades),
 * and generates human-readable commentary using templates and expert insights.
 */
export class NarrativeGenerator {
  private state: NarrativeState;
  private race: Race;
  private horses: Horse[];
  private horsesMap: Map<string, Horse>;
  private stablesMap: Map<string, Stable>;
  private rng: Rng;

  /**
   * Initialize the narrative generator for a specific race.
   *
   * @param race - The race being simulated
   * @param horses - All horses participating in the race
   * @param stables - All stables involved in the race
   * @param rng - Random number generator for variety in commentary
   */
  constructor(race: Race, horses: Horse[], stables: Stable[], rng: Rng) {
    this.state = new NarrativeState();
    this.race = race;
    this.horses = horses;
    this.horsesMap = new Map(horses.map((h) => [h.id, h]));
    this.stablesMap = new Map(stables.map((s) => [s.id, s]));
    this.rng = rng;
  }

  /**
   * Update the narrative generator with current runner positions and sim time.
   *
   * @param runners - Current state of all runners
   * @param simTime - Current elapsed simulation time in seconds
   * @returns Array of new commentary lines generated in this step
   */
  public update(runners: Runner[], simTime: number): CommentaryLine[] {
    const newLines: CommentaryLine[] = [];
    const runnersMap = new Map(runners.map((r) => [r.horseId, r]));
    const sorted = [...runners].sort((a, b) => b.position - a.position);
    const ranks = new Map(sorted.map((r, i) => [r.horseId, i + 1]));
    const currentLeader = sorted[0];

    // Event priority order is significant; do not reorder.
    this.checkRaceStart(runners, simTime, newLines);
    this.checkMilestones(newLines, currentLeader.position, simTime, currentLeader);
    this.checkHotPace(runners, simTime, newLines);
    this.checkAtmosphere(simTime, newLines);
    this.checkGapAnnouncement(sorted, simTime, newLines);
    this.checkStableWatch(runners, simTime, newLines);
    this.checkLeadChange(runners, simTime, newLines);
    this.checkStretchRun(currentLeader, simTime, newLines);
    this.checkFinish(currentLeader, simTime, newLines);
    this.checkIndividualEvents(runners, ranks, simTime, newLines);
    this.checkDrafting(runners, runnersMap, simTime, newLines);
    this.checkLaneWatch(runners, simTime, newLines);
    this.checkConditionTransitions(runners, simTime, newLines);

    this.state.push(...newLines);
    return newLines;
  }

  private checkRaceStart(runners: Runner[], simTime: number, newLines: CommentaryLine[]) {
    if (simTime <= 0 || this.state.hasAnnouncedStart) return;
    newLines.push(this.createLine("START", simTime));
    if (this.race.weather || this.race.trackCondition) {
      newLines.push(this.createLine("WEATHER_COMMENT", simTime));
    }
    const spotlightRunner = runners[Math.floor(this.rng.next() * runners.length)];
    const insight = this.generateExpertInsight(spotlightRunner);
    if (insight) {
      newLines.push({
        id: `insight-${this.state.nextId()}`,
        text: insight,
        timestamp: simTime,
        type: "EXPERT_INSIGHT",
        horseId: spotlightRunner.horseId,
      });
    }
    this.state.hasAnnouncedStart = true;
  }

  private checkAtmosphere(simTime: number, newLines: CommentaryLine[]) {
    const event = detectAtmosphere(
      simTime,
      this.state.hasAnnouncedStart,
      this.state.hasAnnouncedFinish,
    );
    if (
      event &&
      this.rng.next() < NARRATIVE_THRESHOLDS.ATMOSPHERE_PROBABILITY &&
      this.state.canAnnounce(
        "ATMOSPHERE",
        "global",
        simTime,
        NARRATIVE_THRESHOLDS.ATMOSPHERE_COOLDOWN,
      )
    ) {
      newLines.push(this.createLine("ATMOSPHERE", simTime));
      this.state.setCooldown(
        "ATMOSPHERE",
        "global",
        simTime,
        NARRATIVE_THRESHOLDS.ATMOSPHERE_COOLDOWN,
      );
    }
  }

  private checkGapAnnouncement(sorted: Runner[], simTime: number, newLines: CommentaryLine[]) {
    const event = detectGapAnnouncement(
      sorted,
      this.state.hasAnnouncedStart,
      this.state.hasAnnouncedFinish,
    );
    if (event && event.data?.lengths) {
      if (
        this.state.canAnnounce(
          "GAP_ANNOUNCEMENT",
          "leader",
          simTime,
          NARRATIVE_THRESHOLDS.GAP_COOLDOWN,
        )
      ) {
        const leader = sorted[0];
        newLines.push(
          this.createLine("GAP_ANNOUNCEMENT", simTime, leader, event.data.lengths as string),
        );
        this.state.setCooldown(
          "GAP_ANNOUNCEMENT",
          "leader",
          simTime,
          NARRATIVE_THRESHOLDS.GAP_COOLDOWN,
        );
      }
    }
  }

  private checkStableWatch(runners: Runner[], simTime: number, newLines: CommentaryLine[]) {
    for (const r of runners) {
      const event = detectStableWatch(r, this.horsesMap, this.stablesMap, simTime);
      if (event) {
        if (
          this.state.canAnnounce(
            "STABLE_WATCH",
            r.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.STABLE_WATCH_COOLDOWN,
          )
        ) {
          newLines.push(this.createLine("STABLE_WATCH", simTime, r));
          this.state.setCooldown(
            "STABLE_WATCH",
            r.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.STABLE_WATCH_COOLDOWN,
          );
          break;
        }
      }
    }
  }

  private checkLeadChange(runners: Runner[], simTime: number, newLines: CommentaryLine[]) {
    const event = detectLeadChange(
      runners,
      this.state.lastLeaderId,
      this.state.hasAnnouncedStart,
      this.state.hasAnnouncedFinish,
    );
    if (event) {
      if (this.state.canAnnounce("LEAD_CHANGE", event.horseId!, simTime)) {
        const runner = runners.find((r) => r.horseId === event.horseId);
        if (runner) {
          const line = this.createLine("LEAD_CHANGE", simTime, runner);
          line.isHighImpact = true;
          newLines.push(line);
          this.state.setCooldown(
            "LEAD_CHANGE",
            event.horseId!,
            simTime,
            NARRATIVE_THRESHOLDS.LEAD_CHANGE_COOLDOWN,
          );
        }
      }
    }
    const sorted = [...runners].sort((a, b) => b.position - a.position);
    this.state.lastLeaderId = sorted[0]?.horseId ?? null;
  }

  private checkStretchRun(currentLeader: Runner, simTime: number, newLines: CommentaryLine[]) {
    const event = detectStretch(
      currentLeader.position,
      this.race,
      this.state.hasAnnouncedStretch,
      this.state.hasAnnouncedFinish,
    );
    if (event) {
      const line = this.createLine("STRETCH", simTime);
      line.isHighImpact = true;
      newLines.push(line);
      this.state.hasAnnouncedStretch = true;
    }
  }

  private checkFinish(currentLeader: Runner, simTime: number, newLines: CommentaryLine[]) {
    const event = detectFinish(currentLeader.finishTime, this.state.hasAnnouncedFinish);
    if (event) {
      const line = this.createLine("FINISH", simTime, currentLeader);
      line.isHighImpact = true;
      newLines.push(line);
      this.state.hasAnnouncedFinish = true;
    }
  }

  private checkIndividualEvents(
    runners: Runner[],
    ranks: Map<string, number>,
    simTime: number,
    newLines: CommentaryLine[],
  ) {
    if (!this.state.hasAnnouncedStart || this.state.hasAnnouncedFinish) return;
    for (const r of runners) {
      const lastRank = this.state.lastRanks.get(r.horseId);
      const currentRank = ranks.get(r.horseId)!;
      const event = detectPositionChange(
        r,
        lastRank,
        currentRank,
        simTime,
        this.state.hasAnnouncedStart,
        this.state.hasAnnouncedFinish,
      );
      if (event) {
        if (event.type === "SURGE" && this.state.canAnnounce("SURGE", r.horseId, simTime)) {
          newLines.push(this.createLine("SURGE", simTime, r));
          this.state.setCooldown(
            "SURGE",
            r.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.SURGE_FADE_COOLDOWN,
          );
        } else if (event.type === "FADE" && this.state.canAnnounce("FADE", r.horseId, simTime)) {
          newLines.push(this.createLine("FADE", simTime, r));
          this.state.setCooldown(
            "FADE",
            r.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.SURGE_FADE_COOLDOWN,
          );
        }
      }
      this.state.lastRanks.set(r.horseId, currentRank);
    }
  }

  private checkDrafting(
    runners: Runner[],
    runnersMap: Map<string, Runner>,
    simTime: number,
    newLines: CommentaryLine[],
  ) {
    for (const r of runners) {
      const event = detectDrafting(r, runnersMap);
      if (event && event.data?.otherName) {
        if (
          this.state.canAnnounce(
            "DRAFTING",
            r.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.DRAFTING_COOLDOWN,
          )
        ) {
          const line = this.createLine("DRAFTING", simTime, r);
          line.text = line.text.replace("{other}", event.data.otherName as string);
          newLines.push(line);
          this.state.setCooldown(
            "DRAFTING",
            r.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.DRAFTING_COOLDOWN,
          );
        }
      }
    }
  }

  private checkLaneWatch(runners: Runner[], simTime: number, newLines: CommentaryLine[]) {
    if (!this.state.hasAnnouncedStart || this.state.hasAnnouncedFinish) return;
    for (const r of runners) {
      const event = detectLaneWatch(
        r,
        this.race,
        this.state.hasAnnouncedStart,
        this.state.hasAnnouncedFinish,
      );
      if (event) {
        if (
          this.state.canAnnounce(
            "LANE_WATCH",
            r.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.LANE_WATCH_COOLDOWN,
          )
        ) {
          newLines.push(this.createLine("LANE_WATCH", simTime, r));
          this.state.setCooldown(
            "LANE_WATCH",
            r.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.LANE_WATCH_COOLDOWN,
          );
        }
      }
    }
  }

  private checkConditionTransitions(
    runners: Runner[],
    simTime: number,
    newLines: CommentaryLine[],
  ) {
    if (!this.state.hasAnnouncedStart || this.state.hasAnnouncedFinish) return;

    const field = buildFieldContext(runners);

    for (const r of runners) {
      if (r.finishTime !== null) continue;

      this.state.updatePeakVelocity(r.horseId, r.velocity);

      const history: RunnerHistory = {
        peakVelocity: this.state.peakVelocities.get(r.horseId) ?? 0,
      };

      const conditions = deriveRunnerConditions(r, field, history, this.race.distance);
      const currentIds = new Set(conditions.map((c) => c.id));
      const previousIds = this.state.getActiveConditions(r.horseId);

      const newIds = [...currentIds].filter((id) => !previousIds.has(id));

      if (newIds.length === 0) {
        this.state.setActiveConditions(r.horseId, currentIds);
        continue;
      }

      // Ailing fires independently, outside the single-condition limit
      const ailingNew = newIds.find((id) => id === "ailing");
      if (ailingNew) {
        const eventType = CONDITION_TO_EVENT["ailing"];
        const cooldown = CONDITION_COOLDOWN["ailing"];
        if (this.state.canAnnounce(eventType, r.horseId, simTime, cooldown)) {
          const line = this.createLine(eventType, simTime, r);
          newLines.push(line);
          this.state.setCooldown(eventType, r.horseId, simTime, cooldown);
        }
      }

      // For all other new conditions, pick highest priority: emphatic first, then tone
      const nonAilingNew = newIds.filter((id) => id !== "ailing");
      if (nonAilingNew.length > 0) {
        const sorted = nonAilingNew.sort((a, b) => {
          const aCond = conditions.find((c) => c.id === a)!;
          const bCond = conditions.find((c) => c.id === b)!;
          if (aCond.emphatic !== bCond.emphatic) return aCond.emphatic ? -1 : 1;
          return TONE_PRIORITY[aCond.tone] - TONE_PRIORITY[bCond.tone];
        });

        const winner = sorted[0];
        const eventType = CONDITION_TO_EVENT[winner];
        const cooldown = CONDITION_COOLDOWN[winner];
        if (this.state.canAnnounce(eventType, r.horseId, simTime, cooldown)) {
          const line = this.createLine(eventType, simTime, r);
          if (HIGH_IMPACT_CONDITIONS.has(winner)) {
            line.isHighImpact = true;
          }
          newLines.push(line);
          this.state.setCooldown(eventType, r.horseId, simTime, cooldown);
        }
      }

      this.state.setActiveConditions(r.horseId, currentIds);
    }
  }

  /**
   * Generate dynamic milestones based on race distance.
   * @returns Array of milestone objects with position and id.
   */
  private generateDynamicMilestones(): Array<{ pos: number; id: number }> {
    const distance = this.race.distance;
    const milestones: Array<{ pos: number; id: number }> = [];

    // Halfway point (always included)
    milestones.push({
      pos: distance * NARRATIVE_THRESHOLDS.HALFWAY_POSITION,
      id: 50,
    });

    // Final 400m (only if race is long enough)
    if (distance >= NARRATIVE_THRESHOLDS.MIN_DISTANCE_FOR_FINAL_400) {
      milestones.push({
        pos: distance - NARRATIVE_THRESHOLDS.MILESTONE_FINAL_400M,
        id: 400,
      });
    }

    // Final 200m (only if race is long enough)
    if (distance >= NARRATIVE_THRESHOLDS.MIN_DISTANCE_FOR_FINAL_200) {
      milestones.push({
        pos: distance - NARRATIVE_THRESHOLDS.MILESTONE_FINAL_200M,
        id: 200,
      });
    }

    // Final 100m (only if race is long enough)
    if (distance >= NARRATIVE_THRESHOLDS.MIN_DISTANCE_FOR_FINAL_100) {
      milestones.push({
        pos: distance - NARRATIVE_THRESHOLDS.MILESTONE_FINAL_100M,
        id: 100,
      });
    }

    return milestones.sort((a, b) => a.pos - b.pos);
  }

  /**
   * Check for race milestones (halfway, final 400m, etc.) and generate announcements.
   *
   * @param newLines - Accumulator for new commentary lines
   * @param leaderPos - Current position of the race leader
   * @param simTime - Current elapsed simulation time
   * @param leader
   */
  private checkMilestones(
    newLines: CommentaryLine[],
    leaderPos: number,
    simTime: number,
    leader?: Runner,
  ) {
    const milestones = this.generateDynamicMilestones();

    for (const m of milestones) {
      if (leaderPos >= m.pos && !this.state.announcedMilestones.has(m.id)) {
        newLines.push(this.createLine("MILESTONE", simTime, leader));
        this.state.announcedMilestones.add(m.id);
      }
    }
  }

  /**
   * Check for hot pace conditions and generate commentary.
   *
   * Detects when the leader's velocity is significantly above the expected pace
   * for the race distance. Only fires early in the race (before 60% progress)
   * and respects a cooldown to avoid repetitive announcements.
   *
   * @param runners - Current state of all runners
   * @param simTime - Current elapsed simulation time in seconds
   * @param newLines - Accumulator for new commentary lines
   */
  private checkHotPace(runners: Runner[], simTime: number, newLines: CommentaryLine[]) {
    if (!this.state.hasAnnouncedStart || this.state.hasAnnouncedFinish) return;

    const pace = computePaceContext(runners, this.race.distance);
    if (pace.progress > NARRATIVE_THRESHOLDS.HOT_PACE_MAX_PROGRESS) return;

    if (pace.paceRating > NARRATIVE_THRESHOLDS.HOT_PACE_THRESHOLD) {
      if (
        this.state.canAnnounce(
          "HOT_PACE",
          "global",
          simTime,
          NARRATIVE_THRESHOLDS.HOT_PACE_COOLDOWN,
        )
      ) {
        newLines.push(this.createLine("HOT_PACE", simTime));
        this.state.setCooldown(
          "HOT_PACE",
          "global",
          simTime,
          NARRATIVE_THRESHOLDS.HOT_PACE_COOLDOWN,
        );
      }
    }
  }

  /**
   * Generate an expert insight line for a specific runner.
   *
   * @param runner - The runner to generate insight for
   * @returns Expert insight string or null if no insight generated
   */
  private generateExpertInsight(runner: Runner): string | null {
    const horse = this.getHorse(runner.horseId);
    if (!horse) return null;

    const stable = horse.stableId ? (this.getStable(horse.stableId) ?? null) : null;
    return generateExpertInsight(runner, horse, this.race, stable, this.rng);
  }

  /**
   * Helper to create a fully hydrated CommentaryLine object.
   *
   * @param type - The type of narrative event
   * @param timestamp - Current simulation time
   * @param runner - Optional runner involved in the event
   * @param lengths - Optional distance gap in lengths
   * @returns Hydrated CommentaryLine object
   */
  private createLine(
    type: NarrativeEvent,
    timestamp: number,
    runner?: Runner,
    lengths?: string,
  ): CommentaryLine {
    const horse = runner ? this.getHorse(runner.horseId) : undefined;
    const stable = horse?.stableId ? (this.getStable(horse.stableId) ?? null) : null;
    const counter = { value: this.state.lineCounter };
    const line = generateCommentaryLine(
      type,
      timestamp,
      {
        race: this.race,
        runner,
        horse,
        stable,
        rng: this.rng,
        lengths,
        hasAnnouncedBio: this.state.hasAnnouncedBio,
        lastRanks: this.state.lastRanks,
      },
      counter,
    );
    this.state.lineCounter = counter.value;
    return line;
  }

  /**
   * Get horse by ID (optimized with Map lookup).
   * @param id - The horse ID to look up
   * @returns The horse object or undefined if not found
   */
  private getHorse(id: string): Horse | undefined {
    return this.horsesMap.get(id);
  }

  /**
   * Get stable by ID (optimized with Map lookup).
   * @param id - The stable ID to look up
   * @returns The stable object or undefined if not found
   */
  private getStable(id: string): Stable | undefined {
    return this.stablesMap.get(id);
  }

  /**
   * Get the full commentary history for the race.
   *
   * @returns Array of all generated CommentaryLine objects
   */
  public getHistory(): CommentaryLine[] {
    return this.state.getCommentary();
  }
}
