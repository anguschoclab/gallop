import type { CommentaryLine, NarrativeEvent } from "./types";

export interface HorseNarrativeArc {
  mentionedAsStruggling: boolean;
  mentionedAsLeading: boolean;
  mentionedAsSurging: boolean;
  lastStruggleSimTime?: number;
  lastSurgeSimTime?: number;
}

const STRUGGLE_EVENTS: NarrativeEvent[] = ["FADE", "FLAGGING", "IN_TROUBLE", "AILING", "BATTLING", "BOXED_IN"];
const SURGE_EVENTS: NarrativeEvent[] = ["SURGE", "FLYING", "LEAD_CHANGE"];

export class CommentaryMemory {
  private horseArcs: Map<string, HorseNarrativeArc> = new Map();
  private recentEvents: CommentaryLine[] = [];

  recordEvent(line: CommentaryLine): void {
    this.recentEvents.push(line);
    if (this.recentEvents.length > 50) {
      this.recentEvents.shift();
    }

    if (!line.horseId) return;

    const arc = this.getArc(line.horseId);

    if (STRUGGLE_EVENTS.includes(line.type)) {
      arc.mentionedAsStruggling = true;
      arc.lastStruggleSimTime = line.timestamp;
    }

    if (SURGE_EVENTS.includes(line.type)) {
      arc.mentionedAsSurging = true;
      arc.lastSurgeSimTime = line.timestamp;
    }

    if (line.type === "LEAD_CHANGE" || line.type === "GAP_ANNOUNCEMENT") {
      arc.mentionedAsLeading = true;
    }
  }

  getArc(horseId: string): HorseNarrativeArc {
    let arc = this.horseArcs.get(horseId);
    if (!arc) {
      arc = {
        mentionedAsStruggling: false,
        mentionedAsLeading: false,
        mentionedAsSurging: false,
      };
      this.horseArcs.set(horseId, arc);
    }
    return arc;
  }

  canCallback(horseId: string, currentEventType: NarrativeEvent): boolean {
    const arc = this.getArc(horseId);

    if (currentEventType === "SURGE" && arc.mentionedAsStruggling) {
      return true;
    }

    if (currentEventType === "FLYING" && arc.mentionedAsStruggling) {
      return true;
    }

    if (currentEventType === "LEAD_CHANGE" && arc.mentionedAsSurging) {
      return true;
    }

    return false;
  }

  getRecentEvents(): CommentaryLine[] {
    return this.recentEvents;
  }
}
