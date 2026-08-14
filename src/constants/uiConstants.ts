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

// ============================================================================
// RACE CHART — HIGHLIGHT LINE STYLING
// ============================================================================

/** Stroke width for a highlighted (pinned/hovered) runner line in PaceGraph */
export const PACE_GRAPH_HIGHLIGHT_STROKE = 2.5;

/** Stroke width for an owned (but not highlighted) runner line in PaceGraph */
export const PACE_GRAPH_OWNED_STROKE = 2;

/** Stroke width for a default (non-owned, non-highlighted) runner line in PaceGraph */
export const PACE_GRAPH_DEFAULT_STROKE = 1.25;

/** Stroke opacity for a dimmed (non-highlighted when others are highlighted) runner in PaceGraph */
export const PACE_GRAPH_DIM_OPACITY = 0.18;

/** Full stroke opacity for a non-dimmed runner in PaceGraph */
export const PACE_GRAPH_FULL_OPACITY = 1;

/** Dot radius for highlighted runner dots in PaceGraph */
export const PACE_GRAPH_DOT_RADIUS = 3;

/** Active dot radius for hovered runner dots in PaceGraph */
export const PACE_GRAPH_ACTIVE_DOT_RADIUS = 4;

// ============================================================================
// RACE CHART — SPEED BREAKDOWN LINE STYLING
// ============================================================================

/** Stroke width for a highlighted seek line in SpeedBreakdownChart */
export const SPEED_SEEK_HIGHLIGHT_STROKE = 2;

/** Stroke width for an owned seek line in SpeedBreakdownChart */
export const SPEED_SEEK_OWNED_STROKE = 1.5;

/** Stroke width for a default seek line in SpeedBreakdownChart */
export const SPEED_SEEK_DEFAULT_STROKE = 1;

/** Stroke opacity for a dimmed seek line in SpeedBreakdownChart */
export const SPEED_SEEK_DIM_OPACITY = 0.12;

/** Stroke opacity for a normal (non-dimmed) seek line in SpeedBreakdownChart */
export const SPEED_SEEK_NORMAL_OPACITY = 0.5;

/** Stroke width for a highlighted spurt line in SpeedBreakdownChart */
export const SPEED_SPURT_HIGHLIGHT_STROKE = 2.5;

/** Stroke width for an owned spurt line in SpeedBreakdownChart */
export const SPEED_SPURT_OWNED_STROKE = 2;

/** Stroke width for a default spurt line in SpeedBreakdownChart */
export const SPEED_SPURT_DEFAULT_STROKE = 1.25;

/** Stroke opacity for a dimmed spurt line in SpeedBreakdownChart */
export const SPEED_SPURT_DIM_OPACITY = 0.18;

/** Stroke opacity for a normal (non-dimmed) spurt line in SpeedBreakdownChart */
export const SPEED_SPURT_NORMAL_OPACITY = 1;

/** Active dot radius for spurt lines in SpeedBreakdownChart */
export const SPEED_SPURT_ACTIVE_DOT_RADIUS = 4;

// ============================================================================
// RACE CHART — SPEED BREAKDOWN DATA
// ============================================================================

/** Downsample interval: keep every Nth snapshot for Recharts performance */
export const SPEED_DOWNSAMPLE_INTERVAL = 5;

/** Multiplier to convert fractional contributions to percentages for chart display */
export const SPEED_CONTRIBUTION_PERCENT = 100;

/** Quarter-marker fractions for reference lines in SpeedBreakdownChart */
export const SPEED_QUARTER_FRACTIONS = [0.25, 0.5, 0.75, 1.0] as const;

/** Stroke opacity for quarter-marker reference lines in SpeedBreakdownChart */
export const SPEED_REF_LINE_OPACITY = 0.3;
