/**
 * uiConstants.ts - UI layout and interaction constants
 *
 * Centralizes magic numbers used in UI components for consistent
 * styling and interaction behavior.
 */

/** Tooltip delay duration in milliseconds (standard) */
export const TOOLTIP_DELAY_MS = 300;

/** Tooltip delay duration in milliseconds (short, for inline info) */
export const TOOLTIP_DELAY_SHORT_MS = 150;

/** Sidebar width in pixels */
export const SIDEBAR_WIDTH_PX = 248;

/** Maximum number of horses to display in ROI chart */
export const HORSE_ROI_DISPLAY_LIMIT = 5;

/** Sparkline SVG width in pixels */
export const SPARKLINE_WIDTH = 80;

/** Sparkline SVG height in pixels */
export const SPARKLINE_HEIGHT = 20;

/** Sparkline line stroke width */
export const SPARKLINE_STROKE_WIDTH = 1.25;

// ============================================================================
// HORSE COMPARE
// ============================================================================

/** Maximum number of horses selectable for side-by-side comparison */
export const MAX_COMPARE_HORSES = 3;

/** Minimum number of horses required to show the compare dialog content */
export const MIN_COMPARE_HORSES = 2;

// ============================================================================
// HEAD-TO-HEAD SIMULATION
// ============================================================================

/** Number of Monte Carlo iterations for head-to-head race simulation */
export const SIM_ITERATIONS = 50;

/** Default race distance for head-to-head projection (1 mile in meters) */
export const DEFAULT_SIM_DISTANCE = 1600;
