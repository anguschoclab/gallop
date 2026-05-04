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
  | "STABLE_WATCH"
  | "MILESTONE"
  | "EXPERT_INSIGHT"
  | "GAP_ANNOUNCEMENT"
  | "ATMOSPHERE";

export interface CommentaryLine {
  id: string;
  text: string;
  timestamp: number;
  type: NarrativeEvent;
  horseId?: string; // The primary subject of this line
  isHighImpact?: boolean;
}

const METERS_PER_LENGTH = 2.4;

const BIOGRAPHICAL_TEMPLATES = [
  "The {coat} {gender} {horse}, by {sire} out of {dam},",
  "{horse}, the {coat} {gender} representing {stable},",
  "Watch {horse}, a progeny of {sire},",
  "The {stable} runner, {horse},",
  "From the famous {family} family, {horse}",
];

const FRAGMENTS = {
  PREFIXES: [
    "Unbelievable!", "Look at this!", "Incredible action,", "Right now,", "Unfolding before our eyes,",
    "As expected,", "Surprisingly,", "A dramatic turn,", "Stay focused on the pack,",
  ],
};

const EXPERT_INSIGHT_TEMPLATES = {
  POSITIVE_FORM: [
    "{horse} has been in sparkling form lately, looking to continue that today.",
    "Expect a big run from {horse} given their recent track record.",
    "Condition looks peak for {horse} as they load into the gates.",
    "The stable is buzzing about {horse}'s chances today.",
  ],
  NEGATIVE_FORM: [
    "{horse} has struggled to find their best stride in recent starts.",
    "Looking for a bounce-back performance today from {horse}.",
    "Questions about the current fitness of {horse} after that last outing.",
    "This field might be a bit too deep for {horse} today.",
  ],
  DISTANCE_FIT: [
    "This {distance}m trip is right in the wheelhouse for {horse}.",
    "{horse} is a specialist at this distance.",
    "The distance shouldn't be an issue for {horse} today.",
    "Historically, {horse} excels at exactly this trip.",
  ],
  NEW_DISTANCE: [
    "First time at {distance}m for {horse}, a real test of stamina.",
    "Testing the waters at this trip today with {horse}.",
    "Will {horse} see out the full {distance}m? We're about to find out.",
    "A major question mark over {horse} stepping up to this distance.",
  ],
};

const TEMPLATES: Record<NarrativeEvent, string[]> = {
  START: [
    "And they're off in the {raceName}!",
    "The gates are open and they're away!",
    "A clean start for the field in this {raceClass}!",
    "They break cleanly from the gates at {trackName}!",
    "A perfect dispatch for the {raceClass}!",
  ],
  LEAD_CHANGE: [
    "{horse} takes the lead!",
    "{horse} moves to the front!",
    "{horse} has surged into the lead!",
    "New leader! It's {horse} taking control.",
    "{horse} stick's their nose in front!",
    "A bold move by {horse} to grab the initiative!",
    "{horse} is bossing the field now from the front!",
    "The {stable} runner {horse} has found the lead!",
  ],
  SURGE: [
    "{horse} is making a move!",
    "{horse} is finding another gear!",
    "Watch {horse} go! They're gaining ground fast.",
    "{horse} is picking up the pace!",
    "{horse} is accelerating through the field!",
    "The {coat} {gender} {horse} is really starting to motor!",
    "{horse} is weaving through traffic like they're standing still!",
    "{horse} finds a gap on the rail and explodes through!",
    "Going around the outside, it's {horse} flying!",
  ],
  FADE: [
    "{horse} is starting to tire.",
    "{horse} is losing ground.",
    "{horse} is dropping back now.",
    "{horse} can't keep up with this pace.",
    "The early effort is telling on {horse}.",
    "{horse} looks to be hitting a wall here.",
    "{horse} is being left behind as the pace quickens.",
    "Losing touch with the pack, {horse} is in trouble.",
  ],
  STRETCH: [
    "They're turning for home in the {raceName}!",
    "Into the final stretch!",
    "The wire is in sight!",
    "Final furlong! Who's got the legs?",
    "Down the stretch they come!",
    "It's a battle to the wire!",
    "The crowd is on its feet as they hit the straight!",
    "Ears pinned back, they're sprinting for home!",
  ],
  FINISH: [
    "{horse} wins it!",
    "It's {horse} at the wire!",
    "{horse} takes the victory!",
    "A brilliant finish for {horse}!",
    "What a performance by {horse} to take the {raceName}!",
    "He's done it! {horse} is the winner!",
    "A photo finish! But {horse} looks to have it!",
  ],
  POSITION_CHECK: [
    "{horse} is running well in {rank}.",
    "In {rank} place, it's {horse}.",
    "{horse} holds steady in {rank}.",
    "{horse} is currently in {rank}.",
    "Tracking the leaders in {rank} is {horse}.",
    "{horse} is biding their time in {rank}.",
  ],
  DRAFTING: [
    "{horse} is tucked in behind {other}, saving ground.",
    "{horse} finds a nice slipstream behind {other}.",
    "Smart riding by {horse}, drafting behind {other}.",
    "{horse} is biding their time in the pocket.",
    "Conserving energy, {horse} is glued to the back of {other}.",
  ],
  HOT_PACE: [
    "The pace is scorching early on!",
    "They're really flying out there!",
    "A very hot pace being set by the front-runners.",
    "Front-runners are battling hard for the lead.",
    "They're going at a suicidal clip in front!",
  ],
  WEATHER_COMMENT: [
    "The {weather} conditions might favor the stayers today.",
    "It's a {weather} day at the track, surface is {trackCondition}.",
    "The track is {trackCondition}, which will test their mettle.",
    "Conditions are perfect for a fast time today.",
  ],
  STABLE_WATCH: [
    "Keep an eye on the {stable} runner, {horse}.",
    "{stable} will be hoping for a big run from {horse} here.",
    "{horse} carrying the famous {stable} colors.",
    "The {stable} team looks confident with {horse} today.",
  ],
  MILESTONE: [
    "Passing the halfway point now.",
    "Only {remaining}m to go in the {raceName}.",
    "They've got {remaining}m left to find a winner.",
    "Entering the final 400 meters!",
    "They're inside the final 100! Who wants it more?",
  ],
  EXPERT_INSIGHT: [], 
  GAP_ANNOUNCEMENT: [
    "{horse} is leading by {lengths} lengths!",
    "{horse} has a {lengths} length advantage at the front.",
    "{horse} is pulling away! The gap is now {lengths} lengths.",
    "A dominant display from {horse}, clear by {lengths}!",
  ],
  ATMOSPHERE: [
    "The roar of the crowd is deafening!",
    "A tense atmosphere here at {trackName}.",
    "The anticipation is palpable as they round the turn.",
    "Every jockey is looking for that winning opening.",
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
  private announcedMilestones: Set<number> = new Set();

  constructor(race: Race, horses: Horse[], stables: Stable[]) {
    this.race = race;
    this.horses = horses;
    this.stables = stables;
  }

  public update(runners: Runner[], simTime: number, pacePressure: number): CommentaryLine[] {
    const newLines: CommentaryLine[] = [];

    // 1. Race Start & Weather & Initial Insights
    if (simTime > 0 && !this.hasAnnouncedStart) {
      newLines.push(this.createLine("START", simTime));
      if (this.race.weather || this.race.trackCondition) {
        newLines.push(this.createLine("WEATHER_COMMENT", simTime));
      }
      
      const spotlightRunner = runners[Math.floor(Math.random() * runners.length)];
      const insight = this.generateExpertInsight(spotlightRunner);
      if (insight) {
        newLines.push({
          id: Math.random().toString(36).substr(2, 9),
          text: insight,
          timestamp: simTime,
          type: "EXPERT_INSIGHT",
          horseId: spotlightRunner.horseId
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
    if (this.hasAnnouncedStart && !this.hasAnnouncedFinish && Math.random() < 0.005 && this.canAnnounce("ATMOSPHERE", "global", simTime, 45)) {
      newLines.push(this.createLine("ATMOSPHERE", simTime));
      this.setCooldown("ATMOSPHERE", "global", simTime, 45);
    }

    // 5. Gap Announcements
    if (this.hasAnnouncedStart && !this.hasAnnouncedFinish && sorted.length > 1) {
      const gapMeters = sorted[0].position - sorted[1].position;
      const lengths = (gapMeters / METERS_PER_LENGTH).toFixed(1);
      if (parseFloat(lengths) >= 2.0 && this.canAnnounce("GAP_ANNOUNCEMENT", "leader", simTime, 25)) {
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

    // 8. Stretch Run
    if (currentLeader.position > this.race.distance * 0.85 && !this.hasAnnouncedStretch && !this.hasAnnouncedFinish) {
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
          }
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

    // 11. Drafting
    for (const r of runners) {
      if (r.draftingHorseId && this.canAnnounce("DRAFTING", r.horseId, simTime, 40)) {
        const other = runners.find(rr => rr.id === r.draftingHorseId);
        if (other) {
          const line = this.createLine("DRAFTING", simTime, r);
          line.text = line.text.replace("{other}", other.name);
          newLines.push(line);
          this.setCooldown("DRAFTING", r.horseId, simTime, 40);
        }
      }
    }

    // Update history
    this.commentary.push(...newLines);
    return newLines;
  }

  private checkMilestones(newLines: CommentaryLine[], leaderPos: number, simTime: number) {
    const milestones = [
      { pos: this.race.distance * 0.5, id: 50, text: "Passing the halfway point now." },
      { pos: this.race.distance - 400, id: 400, text: "Entering the final 400 meters!" },
      { pos: this.race.distance - 200, id: 200, text: "Just 200 meters to the wire!" },
      { pos: this.race.distance - 100, id: 100, text: "They're inside the final 100! Who wants it more?" },
    ];

    for (const m of milestones) {
      if (leaderPos >= m.pos && !this.announcedMilestones.has(m.id)) {
        newLines.push({
          id: Math.random().toString(36).substr(2, 9),
          text: m.text,
          timestamp: simTime,
          type: "MILESTONE"
        });
        this.announcedMilestones.add(m.id);
      }
    }
  }

  private generateExpertInsight(runner: Runner): string | null {
    const horse = this.getHorse(runner.horseId);
    if (!horse) return null;

    const insights: string[] = [];

    if (horse.form > 5) insights.push(...EXPERT_INSIGHT_TEMPLATES.POSITIVE_FORM);
    else if (horse.form < -5) insights.push(...EXPERT_INSIGHT_TEMPLATES.NEGATIVE_FORM);

    const stable = horse.stableId ? this.getStable(horse.stableId) : null;
    if (stable?.preferredDistance) {
      const diff = Math.abs(this.race.distance - stable.preferredDistance);
      if (diff <= 200) insights.push(...EXPERT_INSIGHT_TEMPLATES.DISTANCE_FIT);
    }

    const hasRunDistance = horse.raceHistory.some(h => h.distance === this.race.distance);
    if (!hasRunDistance && this.race.distance >= 1600) insights.push(...EXPERT_INSIGHT_TEMPLATES.NEW_DISTANCE);

    if (insights.length === 0) return null;

    let text = insights[Math.floor(Math.random() * insights.length)];
    text = text.replace("{horse}", runner.name);
    text = text.replace("{distance}", this.race.distance.toString());

    return text;
  }

  private createLine(type: NarrativeEvent, timestamp: number, runner?: Runner, lengths?: string): CommentaryLine {
    const templates = TEMPLATES[type];
    if (!templates || templates.length === 0) return { id: "", text: "", timestamp: 0, type: "START" };
    
    let text = templates[Math.floor(Math.random() * templates.length)];

    if (Math.random() < 0.2 && (type === "SURGE" || type === "LEAD_CHANGE")) {
      const prefix = FRAGMENTS.PREFIXES[Math.floor(Math.random() * FRAGMENTS.PREFIXES.length)];
      text = `${prefix} ${text}`;
    }

    text = text.replace("{raceName}", this.race.name);
    text = text.replace("{raceClass}", this.race.raceClass);
    text = text.replace("{trackName}", this.race.graded?.track || "the track");
    text = text.replace("{weather}", this.race.weather || "clear");
    text = text.replace("{trackCondition}", this.race.trackCondition || "good");
    text = text.replace("{remaining}", (this.race.distance - (runner?.position || 0)).toFixed(0));
    if (lengths) text = text.replace("{lengths}", lengths);

    if (runner) {
      const horse = this.getHorse(runner.horseId);
      const stable = horse?.stableId ? this.getStable(horse.stableId) : null;
      
      if ((type === "SURGE" || type === "LEAD_CHANGE") && !this.hasAnnouncedBio.has(runner.horseId) && Math.random() < 0.35) {
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
      text = text.replace("{family}", horse?.bruceLoweFamily?.toString() || "Unknown");
      
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
