import type { Runner } from "@/game/raceSim";
import type { Horse, Race, Stable } from "@/game/types";

export type NarrativeEvent =
  | "START"
  | "LEAD_CHANGE"
  | "SURGE"
  | "FADE"
  | "STRETCH"
  | "FINISH"
  | "POSITION_CHECK"
  | "DRAFTING"
  | "HOT_PACE"
  | "WEATHER_COMMENT"
  | "STABLE_WATCH";

export interface CommentaryLine {
  id: string;
  text: string;
  timestamp: number;
  type: NarrativeEvent;
  horseId?: string;
  isHighImpact?: boolean;
}

const BIOGRAPHICAL_TEMPLATES = [
  "The {coat} {gender} {horse}, by {sire} out of {dam},",
  "{horse}, the {coat} {gender} representing {stable},",
  "Watch {horse}, a progeny of {sire},",
  "The {stable} runner, {horse},",
];

const TEMPLATES: Record<NarrativeEvent, string[]> = {
  START: [
    "And they're off in the {raceName}!",
    "The gates are open and they're away!",
    "A clean start for the field in this {raceClass}!",
    "They break cleanly from the gates at {trackName}!",
  ],
  LEAD_CHANGE: [
    "{horse} takes the lead!",
    "{horse} moves to the front!",
    "{horse} has surged into the lead!",
    "New leader! It's {horse} taking control.",
    "{horse} stick's their nose in front!",
  ],
  SURGE: [
    "{horse} is making a move!",
    "{horse} is finding another gear!",
    "Watch {horse} go! They're gaining ground fast.",
    "{horse} is picking up the pace!",
    "{horse} is accelerating through the field!",
    "The {coat} {gender} {horse} is really starting to motor!",
  ],
  FADE: [
    "{horse} is starting to tire.",
    "{horse} is losing ground.",
    "{horse} is dropping back now.",
    "{horse} can't keep up with this pace.",
    "The early effort is telling on {horse}.",
  ],
  STRETCH: [
    "They're turning for home in the {raceName}!",
    "Into the final stretch!",
    "The wire is in sight!",
    "Final furlong! Who's got the legs?",
    "Down the stretch they come!",
    "It's a battle to the wire!",
  ],
  FINISH: [
    "{horse} wins it!",
    "It's {horse} at the wire!",
    "{horse} takes the victory!",
    "A brilliant finish for {horse}!",
    "What a performance by {horse} to take the {raceName}!",
  ],
  POSITION_CHECK: [
    "{horse} is running well in {rank}.",
    "In {rank} place, it's {horse}.",
    "{horse} holds steady in {rank}.",
    "{horse} is currently in {rank}.",
  ],
  DRAFTING: [
    "{horse} is tucked in behind {other}, saving ground.",
    "{horse} finds a nice slipstream behind {other}.",
    "Smart riding by {horse}, drafting behind {other}.",
  ],
  HOT_PACE: [
    "The pace is scorching early on!",
    "They're really flying out there!",
    "A very hot pace being set by the front-runners.",
    "Front-runners are battling hard for the lead.",
  ],
  WEATHER_COMMENT: [
    "The {weather} conditions might favor the stayers today.",
    "It's a {weather} day at the track, surface is {trackCondition}.",
    "The track is {trackCondition}, which will test their mettle.",
  ],
  STABLE_WATCH: [
    "Keep an eye on the {stable} runner, {horse}.",
    "{stable} will be hoping for a big run from {horse} here.",
    "{horse} carrying the famous {stable} colors.",
  ],
};

export class NarrativeGenerator {
  private lastRanks: Map<string, number> = new Map();
  private lastLeaderId: string | null = null;
  private cooldowns: Map<string, number> = new Map();
  private commentary: CommentaryLine[] = [];
  private race: Race;
  private horses: Horse[];
  private stables: Stable[];
  private hasAnnouncedStart = false;
  private hasAnnouncedStretch = false;
  private hasAnnouncedFinish = false;
  private hasAnnouncedBio: Set<string> = new Set();

  constructor(race: Race, horses: Horse[], stables: Stable[]) {
    this.race = race;
    this.horses = horses;
    this.stables = stables;
  }

  public update(runners: Runner[], simTime: number, pacePressure: number): CommentaryLine[] {
    const newLines: CommentaryLine[] = [];

    // 1. Race Start & Weather
    if (simTime > 0 && !this.hasAnnouncedStart) {
      newLines.push(this.createLine("START", simTime));
      if (this.race.weather || this.race.trackCondition) {
        newLines.push(this.createLine("WEATHER_COMMENT", simTime));
      }
      this.hasAnnouncedStart = true;
    }

    // 2. Sort runners by position to get ranks
    const sorted = [...runners].sort((a, b) => b.position - a.position);
    const ranks = new Map(sorted.map((r, i) => [r.horseId, i + 1]));
    const currentLeader = sorted[0];

    // 3. Stable Watch (Early race)
    if (simTime > 2 && simTime < 10) {
      for (const r of runners) {
        const horse = this.getHorse(r.horseId);
        if (horse?.stableId && this.isMajorStable(horse.stableId)) {
          if (this.canAnnounce("STABLE_WATCH", r.horseId, simTime, 60)) {
            newLines.push(this.createLine("STABLE_WATCH", simTime, r));
            this.setCooldown("STABLE_WATCH", r.horseId, simTime, 60);
            break; // Only one stable watch per race start
          }
        }
      }
    }

    // 4. Lead Change
    if (this.hasAnnouncedStart && !this.hasAnnouncedFinish) {
      if (this.lastLeaderId && currentLeader.horseId !== this.lastLeaderId && currentLeader.position > 20) {
        if (this.canAnnounce("LEAD_CHANGE", currentLeader.horseId, simTime)) {
          const line = this.createLine("LEAD_CHANGE", simTime, currentLeader);
          line.isHighImpact = true;
          newLines.push(line);
          this.setCooldown("LEAD_CHANGE", currentLeader.horseId, simTime, 15);
        }
      }
      this.lastLeaderId = currentLeader.horseId;
    }

    // 5. Stretch Run
    if (currentLeader.position > this.race.distance * 0.85 && !this.hasAnnouncedStretch && !this.hasAnnouncedFinish) {
      const line = this.createLine("STRETCH", simTime);
      line.isHighImpact = true;
      newLines.push(line);
      this.hasAnnouncedStretch = true;
    }

    // 6. Finish
    if (currentLeader.finishTime !== null && !this.hasAnnouncedFinish) {
      const line = this.createLine("FINISH", simTime, currentLeader);
      line.isHighImpact = true;
      newLines.push(line);
      this.hasAnnouncedFinish = true;
    }

    // 7. Individual Horse Events (Surge/Fade)
    if (this.hasAnnouncedStart && !this.hasAnnouncedFinish) {
      for (const r of runners) {
        const lastRank = this.lastRanks.get(r.horseId);
        const currentRank = ranks.get(r.horseId)!;

        if (lastRank !== undefined && lastRank !== currentRank) {
          // Surge: Gained at least 2 spots or moved into top 3
          if (lastRank - currentRank >= 2 || (currentRank <= 3 && lastRank > 3)) {
            if (this.canAnnounce("SURGE", r.horseId, simTime)) {
              newLines.push(this.createLine("SURGE", simTime, r));
              this.setCooldown("SURGE", r.horseId, simTime, 20);
            }
          }
          // Fade: Dropped at least 3 spots
          else if (currentRank - lastRank >= 3) {
             if (this.canAnnounce("FADE", r.horseId, simTime)) {
              newLines.push(this.createLine("FADE", simTime, r));
              this.setCooldown("FADE", r.horseId, simTime, 20);
            }
          }
        }
        this.lastRanks.set(r.horseId, currentRank);
      }
    }

    // 8. Hot Pace
    if (pacePressure > 0.7 && this.canAnnounce("HOT_PACE", "field", simTime, 40)) {
      newLines.push(this.createLine("HOT_PACE", simTime));
      this.setCooldown("HOT_PACE", "field", simTime, 40);
    }

    // 9. Periodic Position Check (Middle of race)
    if (this.hasAnnouncedStart && !this.hasAnnouncedStretch && simTime % 15 < 0.1) {
       const midPack = sorted[Math.floor(sorted.length / 2)];
       if (this.canAnnounce("POSITION_CHECK", midPack.horseId, simTime, 20)) {
         newLines.push(this.createLine("POSITION_CHECK", simTime, midPack));
         this.setCooldown("POSITION_CHECK", midPack.horseId, simTime, 20);
       }
    }

    // Update history
    this.commentary.push(...newLines);
    return newLines;
  }

  private createLine(type: NarrativeEvent, timestamp: number, runner?: Runner): CommentaryLine {
    const templates = TEMPLATES[type];
    let text = templates[Math.floor(Math.random() * templates.length)];

    // Global Placeholders
    text = text.replace("{raceName}", this.race.name);
    text = text.replace("{raceClass}", this.race.raceClass);
    text = text.replace("{trackName}", this.race.graded?.track || "the track");
    text = text.replace("{weather}", this.race.weather || "clear");
    text = text.replace("{trackCondition}", this.race.trackCondition || "good");

    if (runner) {
      const horse = this.getHorse(runner.horseId);
      const stable = horse?.stableId ? this.getStable(horse.stableId) : null;
      
      // Biographical injection for certain events (Surge, Lead Change)
      if ((type === "SURGE" || type === "LEAD_CHANGE") && !this.hasAnnouncedBio.has(runner.horseId) && Math.random() < 0.4) {
        const bio = BIOGRAPHICAL_TEMPLATES[Math.floor(Math.random() * BIOGRAPHICAL_TEMPLATES.length)];
        text = bio + " " + text;
        this.hasAnnouncedBio.add(runner.horseId);
      }

      text = text.replace("{horse}", runner.name);
      text = text.replace("{coat}", horse?.coatColor || "colored");
      text = text.replace("{gender}", horse?.gender || "runner");
      text = text.replace("{sire}", horse?.sireName || "Unknown Sire");
      text = text.replace("{dam}", horse?.damName || "Unknown Dam");
      text = text.replace("{stable}", stable?.name || "Independent");
      
      const rank = this.lastRanks.get(runner.horseId);
      if (rank) {
        text = text.replace("{rank}", this.getOrdinal(rank));
      }
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      text,
      timestamp,
      type,
      horseId: runner?.horseId,
    };
  }

  private getHorse(id: string): Horse | undefined {
    return this.horses.find(h => h.id === id);
  }

  private getStable(id: string): Stable | undefined {
    return this.stables.find(s => s.id === id);
  }

  private isMajorStable(id: string): boolean {
    return this.getStable(id)?.isMajor || false;
  }

  private canAnnounce(type: NarrativeEvent, key: string, simTime: number, defaultCooldown: number = 10): boolean {
    const cooldownKey = `${type}:${key}`;
    const expiry = this.cooldowns.get(cooldownKey) || 0;
    return simTime >= expiry;
  }

  private setCooldown(type: NarrativeEvent, key: string, simTime: number, seconds: number) {
    this.cooldowns.set(`${type}:${key}`, simTime + seconds);
  }

  private getOrdinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  public getHistory(): CommentaryLine[] {
    return this.commentary;
  }
}
