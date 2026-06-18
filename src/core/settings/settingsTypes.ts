// Settings Types - User preferences and game configuration
// Stored in SystemsState for persistence

import type { NextActionKind } from "@/core/dashboard/nextAction";

/**
 * Display/visual settings
 */
export interface DisplaySettings {
  /** Compact UI mode - smaller cards and tighter spacing */
  compactMode: boolean;
  /** Show animations in race viewer and UI transitions */
  animationsEnabled: boolean;
  /** Dashboard card layout: grid or list */
  dashboardLayout: "grid" | "list";
  /** Number of items to show per page in lists */
  pageSize: 10 | 25 | 50 | 100;
  /** Show detailed tooltips with full stat breakdowns */
  detailedTooltips: boolean;
  /** Highlight horses with pending actions */
  highlightPendingActions: boolean;
  /** Show letter grades instead of raw numerics on HorseCard (default true) */
  simpleHorseCards: boolean;
  /** Show advanced metrics: raw numerics, genotype string, chromosome breakdown */
  advancedMetrics: boolean;
  /** Timestamp when the next-action banner was dismissed (null = visible) */
  nextActionBannerDismissedAt: number | null;
  /** Which action kind was dismissed (enables per-kind logic in future) */
  nextActionBannerDismissedKind: NextActionKind | null;
}

/**
 * Gameplay/automation settings
 */
export interface GameplaySettings {
  /** Auto-simulate days when no player races scheduled */
  autoSimEnabled: boolean;
  /** Maximum days to auto-simulate at once */
  autoSimMaxDays: 7 | 14 | 30 | 90;
  /** Skip confirmation for low-stakes races (claiming, maiden) */
  skipLowStakesConfirm: boolean;
  /** Auto-enter eligible horses in suitable races */
  suggestRaceEntries: boolean;
  /** Show earnings summary after each race day */
  showDailyEarnings: boolean;
  /** Pause on significant events (awards, Triple Crown races) */
  pauseOnEvents: boolean;
  /** Produce foals with blended names from both parents when breeding */
  parentNameBlendingEnabled: boolean;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  /** Show toast notifications for race results */
  raceResults: boolean;
  /** Show notifications for auction events */
  auctionEvents: boolean;
  /** Show notifications for foaling */
  breedingEvents: boolean;
  /** Show notifications for injuries/health issues */
  healthAlerts: boolean;
  /** Show daily summary of stable activities */
  dailySummary: boolean;
  /** Flash browser tab on important events */
  flashTab: boolean;
}

/**
 * Audio settings (for future audio implementation)
 */
export interface AudioSettings {
  /** Master volume (0-100) */
  masterVolume: number;
  /** Sound effects enabled */
  soundEffects: boolean;
  /** Race ambience enabled */
  raceAmbience: boolean;
  /** UI click sounds */
  uiSounds: boolean;
}

/**
 * All user settings combined
 */
export interface UserSettings {
  display: DisplaySettings;
  gameplay: GameplaySettings;
  notifications: NotificationSettings;
  audio: AudioSettings;
  /** Day settings were last modified */
  lastModified: number;
}

/**
 * Default settings for new games.
 *
 * @param currentDay - Current game day to set as last modified (defaults to 1)
 * @returns Complete UserSettings object with defaults
 */
export function createDefaultUserSettings(currentDay: number = 1): UserSettings {
  return {
    display: {
      compactMode: false,
      animationsEnabled: true,
      dashboardLayout: "grid",
      pageSize: 25,
      detailedTooltips: true,
      highlightPendingActions: true,
      simpleHorseCards: true,
      advancedMetrics: false,
      nextActionBannerDismissedAt: null,
      nextActionBannerDismissedKind: null,
    },
    gameplay: {
      autoSimEnabled: true,
      autoSimMaxDays: 30,
      skipLowStakesConfirm: false,
      suggestRaceEntries: true,
      showDailyEarnings: true,
      pauseOnEvents: true,
      parentNameBlendingEnabled: true,
    },
    notifications: {
      raceResults: true,
      auctionEvents: true,
      breedingEvents: true,
      healthAlerts: true,
      dailySummary: false,
      flashTab: true,
    },
    audio: {
      masterVolume: 50,
      soundEffects: false,
      raceAmbience: false,
      uiSounds: false,
    },
    lastModified: currentDay,
  };
}
