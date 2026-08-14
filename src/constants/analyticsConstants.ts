/**
 * analyticsConstants.ts - Constants for analytics data processing and display
 *
 * Centralizes time windows, bucket sizes, and display limits used across
 * analytics hooks and components.
 */

/** Number of days of cash history to display (cash curve) */
export const ANALYTICS_CASH_LOOKBACK_DAYS = 90;

/** Number of recent race results to consider for win/place/show stats */
export const ANALYTICS_RECENT_RACES_COUNT = 30;

/** Number of weeks to bucket for earnings vs spend chart */
export const ANALYTICS_EARNINGS_WEEKS = 12;

/** Number of days for expense category breakdown */
export const ANALYTICS_EXPENSE_LOOKBACK_DAYS = 30;

/** Maximum number of expense categories to display */
export const ANALYTICS_EXPENSE_TOP_N = 6;

/** Number of days for sire trend history */
export const ANALYTICS_SIRE_TREND_DAYS = 60;

/** Number of energy distribution buckets (0-19, 20-39, 40-59, 60-79, 80-100) */
export const ANALYTICS_ENERGY_BUCKET_COUNT = 5;

/** Energy bucket width (each bucket covers this many energy points) */
export const ANALYTICS_ENERGY_BUCKET_WIDTH = 20;

/** Number of recent race results per horse for ITM sparkline */
export const ANALYTICS_ITM_SPARKLINE_RACES_PER_HORSE = 10;

/** Maximum data points for ITM sparkline */
export const ANALYTICS_ITM_SPARKLINE_MAX_POINTS = 30;

/** Number of top horses to display in ROI chart */
export const ANALYTICS_ROI_TOP_N = 5;

/** Number of weeks to sum for the 30-day income/spend totals (4 weeks ≈ 28 days) */
export const ANALYTICS_INCOME_SPEND_RECENT_WEEKS = 4;

/** Number of top sires to display in breeding tab */
export const ANALYTICS_TOP_SIRES_DISPLAY = 8;

/** Number of top sires to display in trend chart */
export const ANALYTICS_TOP_SIRE_TREND_DISPLAY = 5;

/** Number of horses to display in ROI ranking */
export const ANALYTICS_ROI_RANKING_DISPLAY = 10;

/** Number of horses to display in form chart */
export const ANALYTICS_FORM_CHART_DISPLAY = 12;

/** Number of recent races per horse for form chart */
export const ANALYTICS_FORM_CHART_RECENT_RACES = 10;

/** Number of news items to display in feed widget */
export const DASHBOARD_NEWS_FEED_LIMIT = 15;

/** Number of standings to display in season widget */
export const DASHBOARD_SEASON_STANDINGS_LIMIT = 10;

/** Number of share activity items to display */
export const SHARE_ACTIVITY_FEED_LIMIT = 50;

/** Number of upcoming graded races in nominations tab */
export const NOMINATIONS_UPCOMING_LIMIT = 60;

/** Number of days in weather forecast strip display */
export const WEATHER_FORECAST_STRIP_DAYS = 7;

/** Number of beyer history entries to display */
export const BEYER_CHART_HISTORY_LIMIT = 10;

/** Short time range for standings widget (7 days) */
export const STANDINGS_RANGE_SHORT_DAYS = 7;

/** Medium time range for standings widget (30 days) */
export const STANDINGS_RANGE_MEDIUM_DAYS = 30;

/** Long time range for standings widget (90 days) */
export const STANDINGS_RANGE_LONG_DAYS = 90;

/** Default time range (in days) selected on standings widget load */
export const STANDINGS_DEFAULT_RANGE_DAYS = 30;

/** Number of skeleton placeholder rows while standings are loading */
export const STANDINGS_SKELETON_ROW_COUNT = 5;

/** Maximum recent race results per stable in standings entries */
export const STANDINGS_RECENT_RESULTS_LIMIT = 5;
