import type { Runner } from "@/core/race/engine/runnerBuilder";
import { computePaceContext } from "@/core/race/engine/simulation";
import type { Horse, Race, Stable } from "@/game/types";
import { getStableId } from "@/core/horse/ownership";
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
  detectJockeyEvents,
} from "./eventDetector";
import { NARRATIVE_THRESHOLDS } from "@/constants/narrativeThresholds";
import { NarrativeState } from "./narrativeState";
import { generateDynamicMilestones } from "./narrativeMilestones";
import { checkConditionTransitions } from "./narrativeConditionChecks";
import { JOCKEY_TRAIT_TEMPLATES } from "@/assets/narrative/jockeyTemplates";
import {
  getCourseForRace,
  getTrackById,
  getTrackByName,
  type Track,
  type CourseSpecification,
} from "@/data/tracks";
import {
  ATMOSPHERE_LONG_STRAIGHT_TEMPLATES,
  ATMOSPHERE_TIGHT_TURN_TEMPLATES,
  ATMOSPHERE_GRADED_TEMPLATES,
  ATMOSPHERE_TRIPLE_CROWN_TEMPLATES,
  ATMOSPHERE_ELEVATION_TEMPLATES,
} from "@/assets/narrative/atmosphereTemplates";
import {
  COMEBACK_NOTE_TEMPLATES,
  REDEMPTION_NOTE_TEMPLATES,
  CONFIRMATION_NOTE_TEMPLATES,
  CALLBACK_CLAUSES,
} from "@/assets/narrative/chainingTemplates";
import { MIDRACE_INSIGHT_CLOSER_TEMPLATES } from "@/assets/narrative/ongoingInsightTemplates";
import type { RaceContext } from "./types";
import { CommentaryMemory } from "./commentaryMemory";

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
  private track?: Track;
  private courseSpec?: CourseSpecification;
  private raceContext?: RaceContext;
  private memory: CommentaryMemory;

  /**
   * Initialize the narrative generator for a specific race.
   *
   * @param race - The race being simulated
   * @param horses - All horses participating in the race
   * @param stables - All stables involved in the race
   * @param rng - Random number generator for variety in commentary
   * @param raceContext - Optional race context (defending champion, track record, etc.)
   */
  constructor(race: Race, horses: Horse[], stables: Stable[], rng: Rng, raceContext?: RaceContext) {
    this.state = new NarrativeState();
    this.race = race;
    this.horses = horses;
    this.horsesMap = new Map(horses.map((h) => [h.id, h]));
    this.stablesMap = new Map(stables.map((s) => [s.id, s]));
    this.rng = rng;
    this.raceContext = raceContext;
    this.memory = new CommentaryMemory();
    this.courseSpec = getCourseForRace(race);
    const trackId = race.trackId || race.graded?.trackId;
    const trackName = race.graded?.track;
    if (trackId) this.track = getTrackById(trackId);
    if (!this.track && trackName) this.track = getTrackByName(trackName);
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
    this.checkOngoingInsights(runners, sorted, simTime, newLines);
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
    this.checkJockeyEvents(runners, simTime, newLines);

    this.state.push(...newLines);
    for (const line of newLines) {
      this.memory.recordEvent(line);
    }
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
        receivedAt: Date.now(),
      });
    }
    this.state.hasAnnouncedStart = true;

    // Race context commentary (defending champion, returning runner, course specialist)
    if (this.raceContext) {
      this.checkRaceContext(runners, simTime, newLines);
    }
  }

  private checkRaceContext(runners: Runner[], simTime: number, newLines: CommentaryLine[]) {
    const rc = this.raceContext!;

    // Defending champion
    if (rc.defendingChampion) {
      const champHorse = this.horses.find((h) => h.name === rc.defendingChampion!.horseName);
      const champRunner = champHorse ? runners.find((r) => r.horseId === champHorse.id) : undefined;
      if (champRunner) {
        newLines.push(this.createLine("DEFENDING_CHAMPION", simTime, champRunner));
      }
    }

    // Returning runner — pick first horse with a previous finish position
    for (const runner of runners) {
      const prevPos = rc.previousFinishPositions[runner.horseId];
      if (prevPos) {
        newLines.push(this.createLine("RETURNING_RUNNER", simTime, runner));
        break;
      }
    }

    // Course specialist — pick first horse with >= 3 course visits
    for (const runner of runners) {
      const visits = rc.horseCourseVisits[runner.horseId];
      if (visits && visits >= 3) {
        newLines.push(this.createLine("COURSE_SPECIALIST", simTime, runner));
        break;
      }
    }
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
      let eventType: NarrativeEvent = "ATMOSPHERE";
      // 30% chance to use general atmosphere even when specific category matches
      if (this.rng.next() < 0.3) {
        eventType = "ATMOSPHERE";
      } else if (this.race.graded?.triplecrownKey) {
        eventType = "ATMOSPHERE_TRIPLE_CROWN";
      } else if (this.race.graded) {
        eventType = "ATMOSPHERE_GRADED";
      } else if (this.courseSpec && this.courseSpec.straightLength > 400) {
        eventType = "ATMOSPHERE_LONG_STRAIGHT";
      } else if (this.courseSpec && this.courseSpec.circumference < 1600) {
        eventType = "ATMOSPHERE_TIGHT_TURN";
      } else if (this.track?.elevation) {
        eventType = "ATMOSPHERE_ELEVATION";
      }
      newLines.push(this.createLine(eventType, simTime));
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
          if (
            this.memory.canCallback(runner.horseId, "LEAD_CHANGE") &&
            this.state.canAnnounce(
              "CONFIRMATION_NOTE",
              runner.horseId,
              simTime,
              NARRATIVE_THRESHOLDS.CALLBACK_COOLDOWN,
            ) &&
            this.rng.next() < 0.2
          ) {
            newLines.push(this.createLine("CONFIRMATION_NOTE", simTime, runner));
            this.state.setCooldown(
              "CONFIRMATION_NOTE",
              runner.horseId,
              simTime,
              NARRATIVE_THRESHOLDS.CALLBACK_COOLDOWN,
            );
          } else {
            const line = this.createLine("LEAD_CHANGE", simTime, runner);
            line.isHighImpact = true;
            newLines.push(line);
          }
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

      // Track record check — if leader is on pace
      if (this.raceContext?.trackRecordTime && simTime > 0) {
        const projectedTime = (simTime / currentLeader.position) * this.race.distance;
        if (projectedTime < this.raceContext.trackRecordTime) {
          if (
            this.state.canAnnounce(
              "TRACK_RECORD",
              "global",
              simTime,
              NARRATIVE_THRESHOLDS.ATMOSPHERE_COOLDOWN,
            )
          ) {
            newLines.push(this.createLine("TRACK_RECORD", simTime, currentLeader));
            this.state.setCooldown(
              "TRACK_RECORD",
              "global",
              simTime,
              NARRATIVE_THRESHOLDS.ATMOSPHERE_COOLDOWN,
            );
          }
        }
      }
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
          if (
            this.memory.canCallback(r.horseId, "SURGE") &&
            this.state.canAnnounce(
              "COMEBACK_NOTE",
              r.horseId,
              simTime,
              NARRATIVE_THRESHOLDS.CALLBACK_COOLDOWN,
            ) &&
            this.rng.next() < 0.2
          ) {
            newLines.push(this.createLine("COMEBACK_NOTE", simTime, r));
            this.state.setCooldown(
              "COMEBACK_NOTE",
              r.horseId,
              simTime,
              NARRATIVE_THRESHOLDS.CALLBACK_COOLDOWN,
            );
          } else {
            const line = this.createLine("SURGE", simTime, r);
            if (this.memory.canCallback(r.horseId, "SURGE") && this.rng.next() < 0.2) {
              const clause =
                CALLBACK_CLAUSES[Math.floor(this.rng.next() * CALLBACK_CLAUSES.length)];
              line.text = `${clause}${line.text}`;
            }
            newLines.push(line);
          }
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
    const lines = checkConditionTransitions(runners, simTime, {
      state: this.state,
      race: this.race,
      createLine: (type, timestamp, runner?) => this.createLine(type, timestamp, runner),
    });
    for (const line of lines) {
      if (
        line.type === "FLYING" &&
        line.horseId &&
        this.memory.canCallback(line.horseId, "FLYING") &&
        this.state.canAnnounce(
          "REDEMPTION_NOTE",
          line.horseId,
          simTime,
          NARRATIVE_THRESHOLDS.CALLBACK_COOLDOWN,
        ) &&
        this.rng.next() < 0.2
      ) {
        const runner = runners.find((r) => r.horseId === line.horseId);
        if (runner) {
          newLines.push(this.createLine("REDEMPTION_NOTE", simTime, runner));
          this.state.setCooldown(
            "REDEMPTION_NOTE",
            line.horseId,
            simTime,
            NARRATIVE_THRESHOLDS.CALLBACK_COOLDOWN,
          );
          continue;
        }
      }
      if (
        line.type === "FLYING" &&
        line.horseId &&
        this.memory.canCallback(line.horseId, "FLYING") &&
        this.rng.next() < 0.2
      ) {
        const clause = CALLBACK_CLAUSES[Math.floor(this.rng.next() * CALLBACK_CLAUSES.length)];
        line.text = `${clause}${line.text}`;
      }
      newLines.push(line);
    }
  }

  private checkJockeyEvents(runners: Runner[], simTime: number, newLines: CommentaryLine[]) {
    if (!this.state.hasAnnouncedStart || this.state.hasAnnouncedFinish) return;
    for (const r of runners) {
      const event = detectJockeyEvents(
        r,
        this.race,
        simTime,
        this.state.hasAnnouncedStart,
        this.state.hasAnnouncedFinish,
      );
      if (!event) continue;

      const cooldown =
        event.type === "JOCKEY_MASTERY"
          ? NARRATIVE_THRESHOLDS.JOCKEY_MASTERY_COOLDOWN
          : event.type === "JOCKEY_APPRENTICE"
            ? NARRATIVE_THRESHOLDS.JOCKEY_APPRENTICE_COOLDOWN
            : NARRATIVE_THRESHOLDS.JOCKEY_EVENT_COOLDOWN;

      if (this.state.canAnnounce(event.type, r.horseId, simTime, cooldown)) {
        const line = this.createLine(event.type, simTime, r);
        // For trait-based events, select the specific trait template
        if (event.type === "JOCKEY_TRAIT" && event.data?.trait && r.jockey) {
          const trait = event.data.trait as string;
          const traitTemplates =
            JOCKEY_TRAIT_TEMPLATES[trait as keyof typeof JOCKEY_TRAIT_TEMPLATES];
          if (traitTemplates && traitTemplates.length > 0) {
            const tpl = traitTemplates[Math.floor(this.rng.next() * traitTemplates.length)];
            line.text = this.substituteJockeyTemplate(tpl, r);
          }
        }
        newLines.push(line);
        this.state.setCooldown(event.type, r.horseId, simTime, cooldown);
        break; // Only one jockey event per tick
      }
    }
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
    const milestones = generateDynamicMilestones(this.race);

    for (const m of milestones) {
      if (leaderPos >= m.pos && !this.state.announcedMilestones.has(m.id)) {
        newLines.push(this.createLine(m.eventType, simTime, leader));
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

  private checkOngoingInsights(
    runners: Runner[],
    sorted: Runner[],
    simTime: number,
    newLines: CommentaryLine[],
  ) {
    if (!this.state.hasAnnouncedStart || this.state.hasAnnouncedFinish) return;

    const pace = computePaceContext(runners, this.race.distance);
    const progress = pace.progress;

    // Mid-race insight at ~50% progress
    if (
      progress >= 0.5 &&
      !this.state.hasAnnouncedMidRaceInsight &&
      this.state.canAnnounce(
        "MIDRACE_INSIGHT",
        "global",
        simTime,
        NARRATIVE_THRESHOLDS.MIDRACE_INSIGHT_COOLDOWN,
      )
    ) {
      const topRunner = sorted[Math.min(Math.floor(this.rng.next() * 5), sorted.length - 1)];
      const isCloser = topRunner.jockey?.archetype === "closer";
      newLines.push(
        this.createLine(
          "MIDRACE_INSIGHT",
          simTime,
          topRunner,
          undefined,
          isCloser ? MIDRACE_INSIGHT_CLOSER_TEMPLATES : undefined,
        ),
      );
      this.state.hasAnnouncedMidRaceInsight = true;
      this.state.setCooldown(
        "MIDRACE_INSIGHT",
        "global",
        simTime,
        NARRATIVE_THRESHOLDS.MIDRACE_INSIGHT_COOLDOWN,
      );
    }

    // Closing insight at ~80% progress
    if (
      progress >= 0.8 &&
      !this.state.hasAnnouncedClosingInsight &&
      this.state.canAnnounce(
        "CLOSING_INSIGHT",
        "global",
        simTime,
        NARRATIVE_THRESHOLDS.CLOSING_INSIGHT_COOLDOWN,
      )
    ) {
      const topRunner = sorted[Math.min(Math.floor(this.rng.next() * 3), sorted.length - 1)];
      newLines.push(this.createLine("CLOSING_INSIGHT", simTime, topRunner));
      this.state.hasAnnouncedClosingInsight = true;
      this.state.setCooldown(
        "CLOSING_INSIGHT",
        "global",
        simTime,
        NARRATIVE_THRESHOLDS.CLOSING_INSIGHT_COOLDOWN,
      );
    }

    // Pace analysis when pace rating changes significantly
    if (
      this.state.lastPaceRating !== undefined &&
      Math.abs(pace.paceRating - this.state.lastPaceRating) > 0.3 &&
      this.state.canAnnounce(
        "PACE_ANALYSIS",
        "global",
        simTime,
        NARRATIVE_THRESHOLDS.PACE_ANALYSIS_COOLDOWN,
      )
    ) {
      const topRunner = sorted[Math.min(Math.floor(this.rng.next() * 3), sorted.length - 1)];
      newLines.push(this.createLine("PACE_ANALYSIS", simTime, topRunner));
      this.state.setCooldown(
        "PACE_ANALYSIS",
        "global",
        simTime,
        NARRATIVE_THRESHOLDS.PACE_ANALYSIS_COOLDOWN,
      );
    }
    this.state.lastPaceRating = pace.paceRating;
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

    const stableId = getStableId(horse);
    const stable = stableId ? (this.getStable(stableId) ?? null) : null;
    return generateExpertInsight(runner, horse, this.race, stable, this.rng);
  }

  /**
   * Helper to create a fully hydrated CommentaryLine object.
   *
   * @param type - The type of narrative event
   * @param timestamp - Current simulation time
   * @param runner - Optional runner involved in the event
   * @param lengths - Optional distance gap in lengths
   * @param templateOverride
   * @returns Hydrated CommentaryLine object
   */
  private createLine(
    type: NarrativeEvent,
    timestamp: number,
    runner?: Runner,
    lengths?: string,
    templateOverride?: string[],
  ): CommentaryLine {
    const horse = runner ? this.getHorse(runner.horseId) : undefined;
    const stableId = getStableId(horse);
    const stable = stableId ? (this.getStable(stableId) ?? null) : null;
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
        courseSpec: this.courseSpec,
        track: this.track,
        raceContext: this.raceContext,
        templateOverride,
      },
      counter,
    );
    this.state.lineCounter = counter.value;
    return line;
  }

  /**
   * Substitute jockey-related placeholders in a trait template string.
   * @param template - The template string with jockey/horse placeholders.
   * @param runner - The runner whose jockey info fills the placeholders.
   * @returns The template with all placeholders substituted.
   */
  private substituteJockeyTemplate(template: string, runner: Runner): string {
    let text = template;
    const jockeyName = runner.jockeyName || runner.jockey?.name || "the jockey";
    text = text.split("{jockey}").join(jockeyName);
    text = text.split("{horse}").join(runner.name);
    text = text.split("{jockeyArchetype}").join(runner.jockey?.archetype || "versatile");
    return text;
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
