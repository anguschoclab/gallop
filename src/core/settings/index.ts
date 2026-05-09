/**
 * settings/index.ts - Settings module
 *
 * This module provides user preferences and game configuration functionality.
 *
 * Dependencies: ./settingsTypes (types and functions)
 * Related files: settingsTypes.ts (provides types and functions)
 */

// Settings Module - User preferences and game configuration

// Type exports
export type {
  DisplaySettings,
  GameplaySettings,
  NotificationSettings,
  AudioSettings,
  UserSettings,
} from "./settingsTypes";

// Function exports
export { createDefaultUserSettings } from "./settingsTypes";
