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
  | "EXPERT_INSIGHT"
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
}

export interface DetectedEvent {
  type: NarrativeEvent;
  horseId?: string;
  data?: Record<string, unknown>;
}
