import type { Runner } from "@/game/raceSim";
import type { Horse, Race, Stable } from "@/game/types";
import type { Rng } from "@/game/rng";
import type { NarrativeEvent, CommentaryLine } from "./narrative/types";
import { TEMPLATES } from "@/assets/narrative/templates";
import {
  generateCommentaryLine,
  generateExpertInsight,
} from "./narrative/commentaryGenerator";
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
} from "./narrative/eventDetector";
import {
  MILESTONE_FINAL_400M,
  MILESTONE_FINAL_200M,
  MILESTONE_FINAL_100M,
  MIN_DISTANCE_FOR_FINAL_400,
  MIN_DISTANCE_FOR_FINAL_200,
  MIN_DISTANCE_FOR_FINAL_100,
  GAP_THRESHOLD_LENGTHS,
  STRETCH_THRESHOLD_PERCENT,
  TURN_SEGMENT_LENGTH,
  METERS_PER_LENGTH,
} from "@/game/constants";

// Milestone configuration
export const NARRATIVE_THRESHOLDS = {
  METERS_PER_LENGTH,
  MILESTONE_FINAL_400M,
  MILESTONE_FINAL_200M,
  MILESTONE_FINAL_100M,
  MIN_DISTANCE_FOR_FINAL_400,
  MIN_DISTANCE_FOR_FINAL_200,
  MIN_DISTANCE_FOR_FINAL_100,
  // Event detection thresholds
  ATMOSPHERE_PROBABILITY: 0.005,
  ATMOSPHERE_COOLDOWN: 45,
  GAP_THRESHOLD_LENGTHS,
  GAP_COOLDOWN: 25,
  STABLE_WATCH_START_TIME: 2,
  STABLE_WATCH_END_TIME: 15,
  STABLE_WATCH_COOLDOWN: 60,
  LEAD_CHANGE_THRESHOLD: 20,
  LEAD_CHANGE_COOLDOWN: 15,
  STRETCH_THRESHOLD: STRETCH_THRESHOLD_PERCENT,
  SURGE_RANK_DIFF: 2,
  SURGE_TOP3_RANK_DIFF: 3,
  FADE_RANK_DIFF: 3,
  SURGE_FADE_COOLDOWN: 20,
  DRAFTING_COOLDOWN: 40,
  LANE_THRESHOLD: 3.6,
  LANE_WATCH_COOLDOWN: 45,
  // Turn position thresholds
  TURN_SEGMENT_LENGTH,
  TURN_SEGMENT_START: 400,
  TURN_SEGMENT_END: 800,
  TURN_SEGMENT_FINAL_START: 1200,
  // Milestone positions
  HALFWAY_POSITION: 0.5,
  // Default cooldown
  DEFAULT_COOLDOWN: 10,
} as const;

/**
 * Orchestrates real-time race commentary generation.
 *
 * This class tracks race state, detects significant events (lead changes, surges, fades),
 * and generates human-readable commentary using templates and expert insights.
 */
export class NarrativeGenerator {
  private lastRanks: Map<string, number> = new Map();
  private lastLeaderId: string | null = null;
  private cooldowns: Map<string, number> = new Map();
  private commentary: CommentaryLine[] = [];
  private race: Race;
  private lineCounter = 0;
  private horses: Horse[];
  private horsesMap: Map<string, Horse>;
  private stables: Stable[];
  private stablesMap: Map<string, Stable>;
  private rng: Rng;
  private hasAnnouncedStart = false;
  private hasAnnouncedFinish = false;
  private hasAnnouncedStretch = false;
  private hasAnnouncedBio: Set<string> = new Set();
  private announcedMilestones: Set<number> = new Set();

  /**
   * Initialize the narrative generator for a specific race.
   *
   * @param race - The race being simulated
   * @param horses - All horses participating in the race
   * @param stables - All stables involved in the race
   * @param rng - Random number generator for variety in commentary
   */
  constructor(race: Race, horses: Horse[], stables: Stable[], rng: Rng) {
    this.race = race;
    this.horses = horses;
    this.horsesMap = new Map(horses.map((h) => [h.id, h]));
    this.stables = stables;
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
    this.checkMilestones(newLines, currentLeader.position, simTime);
    this.checkAtmosphere(simTime, newLines);
    this.checkGapAnnouncement(sorted, simTime, newLines);
    this.checkStableWatch(runners, simTime, newLines);
    this.checkLeadChange(runners, simTime, newLines);
    this.checkStretchRun(currentLeader, simTime, newLines);
    this.checkFinish(currentLeader, simTime, newLines);
    this.checkIndividualEvents(runners, ranks, simTime, newLines);
    this.checkDrafting(runners, runnersMap, simTime, newLines);
    this.checkLaneWatch(runners, simTime, newLines);

    this.commentary.push(...newLines);
    return newLines;
  }

  private checkRaceStart(runners: Runner[], simTime: number, newLines: CommentaryLine[]) {
    if (simTime <= 0 || this.hasAnnouncedStart) return;
    newLines.push(this.createLine("START", simTime));
    if (this.race.weather || this.race.trackCondition) {
      newLines.push(this.createLine("WEATHER_COMMENT", simTime));
    }
    const spotlightRunner = runners[Math.floor(this.rng.next() * runners.length)];
    const insight = this.generateExpertInsight(spotlightRunner);
    if (insight) {
      newLines.push({
        id: `insight-${this.lineCounter++}`,
        text: insight,
        timestamp: simTime,
        type: "EXPERT_INSIGHT",
        horseId: spotlightRunner.horseId,
      });
    }
    this.hasAnnouncedStart = true;
  }

  private checkAtmosphere(simTime: number, newLines: CommentaryLine[]) {
    const event = detectAtmosphere(simTime, this.hasAnnouncedStart, this.hasAnnouncedFinish);
    if (
      event &&
      this.rng.next() < NARRATIVE_THRESHOLDS.ATMOSPHERE_PROBABILITY &&
      this.canAnnounce("ATMOSPHERE", "global", simTime, NARRATIVE_THRESHOLDS.ATMOSPHERE_COOLDOWN)
    ) {
      newLines.push(this.createLine("ATMOSPHERE", simTime));
      this.setCooldown("ATMOSPHERE", "global", simTime, NARRATIVE_THRESHOLDS.ATMOSPHERE_COOLDOWN);
    }
  }

  private checkGapAnnouncement(
    sorted: Runner[],
    simTime: number,
    newLines: CommentaryLine[],
  ) {
    const event = detectGapAnnouncement(sorted, this.hasAnnouncedStart, this.hasAnnouncedFinish);
    if (event && event.data?.lengths) {
      if (
        this.canAnnounce("GAP_ANNOUNCEMENT", "leader", simTime, NARRATIVE_THRESHOLDS.GAP_COOLDOWN)
      ) {
        const leader = sorted[0];
        newLines.push(
          this.createLine("GAP_ANNOUNCEMENT", simTime, leader, event.data.lengths as string),
        );
        this.setCooldown("GAP_ANNOUNCEMENT", "leader", simTime, NARRATIVE_THRESHOLDS.GAP_COOLDOWN);
      }
    }
  }

  private checkStableWatch(runners: Runner[], simTime: number, newLines: CommentaryLine[]) {
    for (const r of runners) {
      const event = detectStableWatch(r, this.horsesMap, this.stablesMap, simTime);
      if (event) {
        if (
          this.canAnnounce(
            "STABLE_WATCH",
            r.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.STABLE_WATCH_COOLDOWN,
          )
        ) {
          newLines.push(this.createLine("STABLE_WATCH", simTime, r));
          this.setCooldown(
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
    const event = detectLeadChange(runners, this.lastLeaderId, this.hasAnnouncedStart, this.hasAnnouncedFinish);
    if (event) {
      if (this.canAnnounce("LEAD_CHANGE", event.horseId!, simTime)) {
        const runner = runners.find((r) => r.horseId === event.horseId);
        if (runner) {
          const line = this.createLine("LEAD_CHANGE", simTime, runner);
          line.isHighImpact = true;
          newLines.push(line);
          this.setCooldown(
            "LEAD_CHANGE",
            event.horseId!,
            simTime,
            NARRATIVE_THRESHOLDS.LEAD_CHANGE_COOLDOWN,
          );
        }
      }
    }
    const sorted = [...runners].sort((a, b) => b.position - a.position);
    this.lastLeaderId = sorted[0]?.horseId ?? null;
  }

  private checkStretchRun(currentLeader: Runner, simTime: number, newLines: CommentaryLine[]) {
    const event = detectStretch(
      currentLeader.position,
      this.race,
      this.hasAnnouncedStretch,
      this.hasAnnouncedFinish,
    );
    if (event) {
      const line = this.createLine("STRETCH", simTime);
      line.isHighImpact = true;
      newLines.push(line);
      this.hasAnnouncedStretch = true;
    }
  }

  private checkFinish(currentLeader: Runner, simTime: number, newLines: CommentaryLine[]) {
    const event = detectFinish(currentLeader.finishTime, this.hasAnnouncedFinish);
    if (event) {
      const line = this.createLine("FINISH", simTime, currentLeader);
      line.isHighImpact = true;
      newLines.push(line);
      this.hasAnnouncedFinish = true;
    }
  }

  private checkIndividualEvents(
    runners: Runner[],
    ranks: Map<string, number>,
    simTime: number,
    newLines: CommentaryLine[],
  ) {
    if (!this.hasAnnouncedStart || this.hasAnnouncedFinish) return;
    for (const r of runners) {
      const lastRank = this.lastRanks.get(r.horseId);
      const currentRank = ranks.get(r.horseId)!;
      const event = detectPositionChange(
        r,
        lastRank,
        currentRank,
        simTime,
        this.hasAnnouncedStart,
        this.hasAnnouncedFinish,
      );
      if (event) {
        if (event.type === "SURGE" && this.canAnnounce("SURGE", r.horseId, simTime)) {
          newLines.push(this.createLine("SURGE", simTime, r));
          this.setCooldown("SURGE", r.horseId, simTime, NARRATIVE_THRESHOLDS.SURGE_FADE_COOLDOWN);
        } else if (event.type === "FADE" && this.canAnnounce("FADE", r.horseId, simTime)) {
          newLines.push(this.createLine("FADE", simTime, r));
          this.setCooldown("FADE", r.horseId, simTime, NARRATIVE_THRESHOLDS.SURGE_FADE_COOLDOWN);
        }
      }
      this.lastRanks.set(r.horseId, currentRank);
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
          this.canAnnounce("DRAFTING", r.horseId, simTime, NARRATIVE_THRESHOLDS.DRAFTING_COOLDOWN)
        ) {
          const line = this.createLine("DRAFTING", simTime, r);
          line.text = line.text.replace("{other}", event.data.otherName as string);
          newLines.push(line);
          this.setCooldown("DRAFTING", r.horseId, simTime, NARRATIVE_THRESHOLDS.DRAFTING_COOLDOWN);
        }
      }
    }
  }

  private checkLaneWatch(runners: Runner[], simTime: number, newLines: CommentaryLine[]) {
    if (!this.hasAnnouncedStart || this.hasAnnouncedFinish) return;
    for (const r of runners) {
      const event = detectLaneWatch(r, this.race, this.hasAnnouncedStart, this.hasAnnouncedFinish);
      if (event) {
        if (
          this.canAnnounce(
            "LANE_WATCH",
            r.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.LANE_WATCH_COOLDOWN,
          )
        ) {
          newLines.push(this.createLine("LANE_WATCH", simTime, r));
          this.setCooldown(
            "LANE_WATCH",
            r.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.LANE_WATCH_COOLDOWN,
          );
        }
      }
    }
  }

  /**
   * Determine if a horse at a specific position is currently in a turn.
   *
   * @param pos - Current position of the horse in meters
   * @returns True if the horse is in a turn section of the track
   */
  private isInTurn(pos: number): boolean {
    // Basic oval assumption: 400m home straight, 400m turn, 400m back straight, 400m turn
    const distFromFinish = this.race.distance - pos;
    const trackPos = distFromFinish % NARRATIVE_THRESHOLDS.TURN_SEGMENT_LENGTH;
    return (
      (trackPos > NARRATIVE_THRESHOLDS.TURN_SEGMENT_START &&
        trackPos <= NARRATIVE_THRESHOLDS.TURN_SEGMENT_END) ||
      trackPos > NARRATIVE_THRESHOLDS.TURN_SEGMENT_FINAL_START
    );
  }

  /**
   * Generate dynamic milestones based on race distance.
   * @returns Array of milestone objects with position, id, and text.
   */
  private generateDynamicMilestones(): Array<{ pos: number; id: number; text: string }> {
    const distance = this.race.distance;
    const milestones: Array<{ pos: number; id: number; text: string }> = [];

    // Halfway point (always included)
    milestones.push({
      pos: distance * NARRATIVE_THRESHOLDS.HALFWAY_POSITION,
      id: 50,
      text: "Passing the halfway point now.",
    });

    // Final 400m (only if race is long enough)
    if (distance >= NARRATIVE_THRESHOLDS.MIN_DISTANCE_FOR_FINAL_400) {
      milestones.push({
        pos: distance - NARRATIVE_THRESHOLDS.MILESTONE_FINAL_400M,
        id: 400,
        text: "Entering the final 400 meters!",
      });
    }

    // Final 200m (only if race is long enough)
    if (distance >= NARRATIVE_THRESHOLDS.MIN_DISTANCE_FOR_FINAL_200) {
      milestones.push({
        pos: distance - NARRATIVE_THRESHOLDS.MILESTONE_FINAL_200M,
        id: 200,
        text: "Just 200 meters to the wire!",
      });
    }

    // Final 100m (only if race is long enough)
    if (distance >= NARRATIVE_THRESHOLDS.MIN_DISTANCE_FOR_FINAL_100) {
      milestones.push({
        pos: distance - NARRATIVE_THRESHOLDS.MILESTONE_FINAL_100M,
        id: 100,
        text: "They're inside the final 100! Who wants it more?",
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
   */
  private checkMilestones(newLines: CommentaryLine[], leaderPos: number, simTime: number) {
    const milestones = this.generateDynamicMilestones();

    for (const m of milestones) {
      if (leaderPos >= m.pos && !this.announcedMilestones.has(m.id)) {
        newLines.push({
          id: `milestone-${m.id}`,
          text: m.text,
          timestamp: simTime,
          type: "MILESTONE",
        });
        this.announcedMilestones.add(m.id);
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

    return generateCommentaryLine(
      type,
      timestamp,
      {
        race: this.race,
        runner,
        horse,
        stable,
        rng: this.rng,
        lengths,
        hasAnnouncedBio: this.hasAnnouncedBio,
        lastRanks: this.lastRanks,
      },
      { value: this.lineCounter },
    );
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
   * Determine if a stable is considered a "major" player for commentary focus.
   *
   * @param id - Unique identifier for the stable
   * @returns True if it is a major stable
   */
  private isMajorStable(id: string): boolean {
    return this.getStable(id)?.isMajor || false;
  }

  /**
   * Check if a specific event type can be announced (cooldown check).
   *
   * @param type - Narrative event type
   * @param key - Context key for the cooldown (e.g. horse ID or "global")
   * @param simTime - Current simulation time
   * @param defaultCooldown - Cooldown duration in seconds (defaults to 10)
   * @returns True if the event can be announced
   */
  private canAnnounce(
    type: NarrativeEvent,
    key: string,
    simTime: number,
    defaultCooldown: number = NARRATIVE_THRESHOLDS.DEFAULT_COOLDOWN,
  ): boolean {
    const cooldownKey = `${type}:${key}`;
    const expiry = this.cooldowns.get(cooldownKey) || 0;
    return simTime >= expiry;
  }

  /**
   * Set a cooldown for a specific event type and context.
   *
   * @param type - Narrative event type
   * @param key - Context key for the cooldown
   * @param simTime - Current simulation time
   * @param seconds - Cooldown duration in seconds
   */
  private setCooldown(type: NarrativeEvent, key: string, simTime: number, seconds: number) {
    this.cooldowns.set(`${type}:${key}`, simTime + seconds);
  }

  /**
   * Get the full commentary history for the race.
   *
   * @returns Array of all generated CommentaryLine objects
   */
  public getHistory(): CommentaryLine[] {
    return this.commentary;
  }
}
