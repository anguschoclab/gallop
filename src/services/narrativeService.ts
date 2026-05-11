import type { Runner } from "@/game/raceSim";
import type { Horse, Race, Stable } from "@/game/types";
import type { Rng } from "@/game/rng";
import type { NarrativeEvent } from "./narrative/commentaryGenerator";
import type { CommentaryLine } from "./narrative/commentaryGenerator";
import { TEMPLATES } from "@/assets/narrative/templates";
import {
  generateCommentaryLine,
  generateExpertInsight,
  getOrdinal,
} from "./narrative/commentaryGenerator";
import {
  detectLeadChange,
  detectPositionChange,
  detectDrafting,
  detectLaneWatch,
  detectGapAnnouncement,
  detectStretch,
  detectFinish,
  detectMilestones,
  detectStableWatch,
  detectAtmosphere,
} from "./narrative/eventDetector";

const METERS_PER_LENGTH = 2.4;

export class NarrativeGenerator {
  private lastRanks: Map<string, number> = new Map();
  private lastLeaderId: string | null = null;
  private cooldowns: Map<string, number> = new Map();
  private commentary: CommentaryLine[] = [];
  private race: Race;
  private lineCounter = 0;
  private horses: Horse[];
  private stables: Stable[];
  private rng: Rng;
  private hasAnnouncedStart = false;
  private hasAnnouncedFinish = false;
  private hasAnnouncedStretch = false;
  private hasAnnouncedBio: Set<string> = new Set();
  private announcedMilestones: Set<number> = new Set();

  constructor(race: Race, horses: Horse[], stables: Stable[], rng: Rng) {
    this.race = race;
    this.horses = horses;
    this.stables = stables;
    this.rng = rng;
  }

  public update(runners: Runner[], simTime: number, pacePressure: number): CommentaryLine[] {
    const newLines: CommentaryLine[] = [];

    // 1. Race Start & Weather & Initial Insights
    if (simTime > 0 && !this.hasAnnouncedStart) {
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

    // 2. Sort runners by position to get ranks
    const sorted = [...runners].sort((a, b) => b.position - a.position);
    const ranks = new Map(sorted.map((r, i) => [r.horseId, i + 1]));
    const currentLeader = sorted[0];

    // 3. Milestones
    this.checkMilestones(newLines, currentLeader.position, simTime);

    // 4. Atmosphere
    if (
      this.hasAnnouncedStart &&
      !this.hasAnnouncedFinish &&
      this.rng.next() < 0.005 &&
      this.canAnnounce("ATMOSPHERE", "global", simTime, 45)
    ) {
      newLines.push(this.createLine("ATMOSPHERE", simTime));
      this.setCooldown("ATMOSPHERE", "global", simTime, 45);
    }

    // 5. Gap Announcements
    if (this.hasAnnouncedStart && !this.hasAnnouncedFinish && sorted.length > 1) {
      const gapMeters = sorted[0].position - sorted[1].position;
      const lengths = (gapMeters / METERS_PER_LENGTH).toFixed(1);
      if (
        parseFloat(lengths) >= 2.0 &&
        this.canAnnounce("GAP_ANNOUNCEMENT", "leader", simTime, 25)
      ) {
        newLines.push(this.createLine("GAP_ANNOUNCEMENT", simTime, sorted[0], lengths));
        this.setCooldown("GAP_ANNOUNCEMENT", "leader", simTime, 25);
      }
    }

    // 6. Stable Watch
    if (simTime > 2 && simTime < 15) {
      for (const r of runners) {
        const horse = this.getHorse(r.horseId);
        if (horse?.stableId && this.isMajorStable(horse.stableId)) {
          if (this.canAnnounce("STABLE_WATCH", r.horseId, simTime, 60)) {
            newLines.push(this.createLine("STABLE_WATCH", simTime, r));
            this.setCooldown("STABLE_WATCH", r.horseId, simTime, 60);
            break;
          }
        }
      }
    }

    // 7. Lead Change
    if (this.hasAnnouncedStart && !this.hasAnnouncedFinish) {
      if (
        this.lastLeaderId &&
        currentLeader.horseId !== this.lastLeaderId &&
        currentLeader.position > 20
      ) {
        if (this.canAnnounce("LEAD_CHANGE", currentLeader.horseId, simTime)) {
          const line = this.createLine("LEAD_CHANGE", simTime, currentLeader);
          line.isHighImpact = true;
          newLines.push(line);
          this.setCooldown("LEAD_CHANGE", currentLeader.horseId, simTime, 15);
        }
      }
      this.lastLeaderId = currentLeader.horseId;
    }

    // 8. Stretch Run
    if (
      currentLeader.position > this.race.distance * 0.85 &&
      !this.hasAnnouncedStretch &&
      !this.hasAnnouncedFinish
    ) {
      const line = this.createLine("STRETCH", simTime);
      line.isHighImpact = true;
      newLines.push(line);
      this.hasAnnouncedStretch = true;
    }

    // 9. Finish
    if (currentLeader.finishTime !== null && !this.hasAnnouncedFinish) {
      const line = this.createLine("FINISH", simTime, currentLeader);
      line.isHighImpact = true;
      newLines.push(line);
      this.hasAnnouncedFinish = true;
    }

    // 10. Individual Horse Events
    if (this.hasAnnouncedStart && !this.hasAnnouncedFinish) {
      for (const r of runners) {
        const lastRank = this.lastRanks.get(r.horseId);
        const currentRank = ranks.get(r.horseId)!;

        if (lastRank !== undefined && lastRank !== currentRank) {
          if (lastRank - currentRank >= 2 || (currentRank <= 3 && lastRank > 3)) {
            if (this.canAnnounce("SURGE", r.horseId, simTime)) {
              newLines.push(this.createLine("SURGE", simTime, r));
              this.setCooldown("SURGE", r.horseId, simTime, 20);
            }
          } else if (currentRank - lastRank >= 3) {
            if (this.canAnnounce("FADE", r.horseId, simTime)) {
              newLines.push(this.createLine("FADE", simTime, r));
              this.setCooldown("FADE", r.horseId, simTime, 20);
            }
          }
        }
        this.lastRanks.set(r.horseId, currentRank);
      }
    }

    // 11. Drafting
    for (const r of runners) {
      if (r.draftingHorseId && this.canAnnounce("DRAFTING", r.horseId, simTime, 40)) {
        const other = runners.find((rr) => rr.horseId === r.draftingHorseId);
        if (other) {
          const line = this.createLine("DRAFTING", simTime, r);
          line.text = line.text.replace("{other}", other.name);
          newLines.push(line);
          this.setCooldown("DRAFTING", r.horseId, simTime, 40);
        }
      }
    }

    // 12. Lane Watch (trapped wide on turn)
    if (this.hasAnnouncedStart && !this.hasAnnouncedFinish) {
      for (const r of runners) {
        // If they are in Lane 3+ (3.6m+) and likely in a turn
        if (
          r.lane >= 3.6 &&
          this.isInTurn(r.position) &&
          this.canAnnounce("LANE_WATCH", r.horseId, simTime, 45)
        ) {
          newLines.push(this.createLine("LANE_WATCH", simTime, r));
          this.setCooldown("LANE_WATCH", r.horseId, simTime, 45);
        }
      }
    }

    // Update history
    this.commentary.push(...newLines);
    return newLines;
  }

  private isInTurn(pos: number): boolean {
    // Basic oval assumption: 400m home straight, 400m turn, 400m back straight, 400m turn
    const distFromFinish = this.race.distance - pos;
    const trackPos = distFromFinish % 1600;
    return (trackPos > 400 && trackPos <= 800) || trackPos > 1200;
  }

  private checkMilestones(newLines: CommentaryLine[], leaderPos: number, simTime: number) {
    const milestones = [
      { pos: this.race.distance * 0.5, id: 50, text: "Passing the halfway point now." },
      { pos: this.race.distance - 400, id: 400, text: "Entering the final 400 meters!" },
      { pos: this.race.distance - 200, id: 200, text: "Just 200 meters to the wire!" },
      {
        pos: this.race.distance - 100,
        id: 100,
        text: "They're inside the final 100! Who wants it more?",
      },
    ];

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

  private generateExpertInsight(runner: Runner): string | null {
    const horse = this.getHorse(runner.horseId);
    if (!horse) return null;

    const stable = horse.stableId ? (this.getStable(horse.stableId) ?? null) : null;
    return generateExpertInsight(runner, horse, this.race, stable, this.rng);
  }

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

  private getHorse(id: string): Horse | undefined {
    return this.horses.find((h) => h.id === id);
  }

  private getStable(id: string): Stable | undefined {
    return this.stables.find((s) => s.id === id);
  }

  private isMajorStable(id: string): boolean {
    return this.getStable(id)?.isMajor || false;
  }

  private canAnnounce(
    type: NarrativeEvent,
    key: string,
    simTime: number,
    defaultCooldown: number = 10,
  ): boolean {
    const cooldownKey = `${type}:${key}`;
    const expiry = this.cooldowns.get(cooldownKey) || 0;
    return simTime >= expiry;
  }

  private setCooldown(type: NarrativeEvent, key: string, simTime: number, seconds: number) {
    this.cooldowns.set(`${type}:${key}`, simTime + seconds);
  }

  public getHistory(): CommentaryLine[] {
    return this.commentary;
  }
}
