/**
 * Shared types for the narrative / commentary system.
 */

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
  | "MILESTONE_HALFWAY"
  | "MILESTONE_FINAL_400"
  | "MILESTONE_FINAL_200"
  | "MILESTONE_FINAL_100"
  | "EXPERT_INSIGHT"
  | "JOCKEY_MOVE"
  | "JOCKEY_TACTIC"
  | "JOCKEY_MASTERY"
  | "JOCKEY_APPRENTICE"
  | "JOCKEY_TRAIT"
  | "ATMOSPHERE_LONG_STRAIGHT"
  | "ATMOSPHERE_TIGHT_TURN"
  | "ATMOSPHERE_GRADED"
  | "ATMOSPHERE_TRIPLE_CROWN"
  | "ATMOSPHERE_ELEVATION"
  | "DEFENDING_CHAMPION"
  | "TRACK_RECORD"
  | "RETURNING_RUNNER"
  | "COURSE_SPECIALIST"
  | "MIDRACE_INSIGHT"
  | "CLOSING_INSIGHT"
  | "PACE_ANALYSIS"
  | "COMEBACK_NOTE"
  | "REDEMPTION_NOTE"
  | "CONFIRMATION_NOTE"
  | "GAP_ANNOUNCEMENT"
  | "ATMOSPHERE"
  | "LANE_WATCH"
  | "FLYING"
  | "BATTLING"
  | "BOXED_IN"
  | "GRINDING"
  | "FLAGGING"
  | "IN_TROUBLE"
  | "AILING"
  | "SETTLED";

export interface CommentaryLine {
  id: string;
  text: string;
  timestamp: number;
  type: NarrativeEvent;
  horseId?: string;
  isHighImpact?: boolean;
  /** Wall-clock timestamp (ms) when this PBP tick was generated or received. */
  receivedAt?: number;
}

export interface DetectedEvent {
  type: NarrativeEvent;
  horseId?: string;
  data?: Record<string, unknown>;
}

export interface RaceContext {
  defendingChampion?: { horseName: string; year: number };
  trackRecordTime?: number;
  trackRecordHolder?: string;
  previousFinishPositions: Record<string, number>;
  horseCourseVisits: Record<string, number>;
}
