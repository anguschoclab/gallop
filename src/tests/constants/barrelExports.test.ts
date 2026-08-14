import { describe, it, expect } from "vitest";
import * as barrel from "@/constants";

describe("barrel exports — all domain files re-exported", () => {
  it("exports economic constants", () => {
    expect(barrel.PRIZE_SPLIT).toBeDefined();
    expect(barrel.STARTING_CASH).toBeDefined();
    expect(barrel.UPKEEP_PER_HORSE).toBeDefined();
  });

  it("exports auction constants", () => {
    expect(barrel.AUCTION_AGGRESSIVE_PREMIUM).toBeDefined();
    expect(barrel.DEFAULT_PLAYER_RESERVE_RATIO).toBeDefined();
    expect(barrel.AUCTION_RESERVE_ELITE).toBeDefined();
  });

  it("exports raceClassification constants", () => {
    expect(barrel.ENTRY_MAIDEN).toBeDefined();
    expect(barrel.PURSE_STAKES).toBeDefined();
    expect(barrel.RACE_GRADES).toBeDefined();
    expect(barrel.DEFAULT_FIELD_SIZE).toBeDefined();
    expect(barrel.MINIMUM_RACE_ENTRIES).toBeDefined();
  });

  it("exports raceSimulation constants", () => {
    expect(barrel.PHOTO_FINISH_THRESHOLD_SECONDS).toBeDefined();
    expect(barrel.BEYER_MIN).toBeDefined();
    expect(barrel.POSITION_WIN).toBeDefined();
    expect(barrel.TOP_FINISH_POSITION).toBeDefined();
    expect(barrel.BEYER_NULL_SENTINEL).toBeDefined();
    expect(barrel.SIMULATION_MAX_STEPS_PER_FRAME).toBeDefined();
  });

  it("exports fame constants", () => {
    expect(barrel.MAX_FAME).toBeDefined();
    expect(barrel.FAME_GAIN_G1_WIN).toBeDefined();
    expect(barrel.HALL_OF_FAME_FAME_THRESHOLD).toBeDefined();
  });

  it("exports energyRecovery constants", () => {
    expect(barrel.ENERGY_LOW_THRESHOLD).toBeDefined();
    expect(barrel.ENERGY_MAX).toBeDefined();
    expect(barrel.DEFAULT_RECOVERY_POINTS).toBeDefined();
  });

  it("exports horseStat constants", () => {
    expect(barrel.GRADE_S_THRESHOLD).toBeDefined();
    expect(barrel.STAT_SCALE_MAX).toBeDefined();
    expect(barrel.AGE_RETIREMENT_THRESHOLD).toBeDefined();
  });

  it("exports healthInjury constants", () => {
    expect(barrel.INJURY_RECOVERY_MIN).toBeDefined();
    expect(barrel.INJURY_SEVERITY_THRESHOLD).toBeDefined();
    expect(barrel.INJURY_PRONENESS_LOW_THRESHOLD).toBeDefined();
  });

  it("exports ai constants", () => {
    expect(barrel.AI_RISK_TOLERANCE_CONSERVATIVE).toBeDefined();
    expect(barrel.NPC_HORSE_COUNT_ELITE_MIN).toBeDefined();
    expect(barrel.DEFAULT_SUBSYSTEM_WEIGHT).toBeDefined();
  });

  it("exports raceEntry constants", () => {
    expect(barrel.MAX_HORSES_PER_STABLE_PER_RACE).toBeDefined();
    expect(barrel.MIN_ENERGY_TO_ENTER).toBeDefined();
    expect(barrel.FOAL_BREAKING_IN_DAY).toBeDefined();
  });

  it("exports news constants", () => {
    expect(barrel.NEWS_HIGH_IMPORTANCE_PRICE_THRESHOLD).toBeDefined();
    expect(barrel.NEWS_FLAVOR_DAILY_PROBABILITY).toBeDefined();
  });

  it("exports dashboard constants", () => {
    expect(barrel.DASHBOARD_UPCOMING_RACES_LIMIT).toBeDefined();
    expect(barrel.DASHBOARD_NEWS_FEED_LIMIT).toBeDefined();
    expect(barrel.STANDINGS_RANGE_SHORT_DAYS).toBeDefined();
  });

  it("exports calendar constants", () => {
    expect(barrel.DAYS_PER_WEEK).toBeDefined();
    expect(barrel.DAYS_PER_YEAR).toBeDefined();
    expect(barrel.AUTOSIM_DAYS_OPTIONS).toBeDefined();
  });

  it("exports storageLimits constants", () => {
    expect(barrel.HALL_OF_FAME_MAX_SIZE).toBeDefined();
    expect(barrel.RECENT_RACES_MAX_COUNT).toBeDefined();
    expect(barrel.RACE_HISTORY_LIMIT_LOW).toBeDefined();
  });

  it("exports raceEngine constants", () => {
    expect(barrel.DEFAULT_DT).toBeDefined();
    expect(barrel.TOP_SPEED_CEILING).toBeDefined();
  });

  it("exports inbox constants", () => {
    expect(barrel.TOOLTIP_DELAY_MS).toBeDefined();
  });

  it("exports regional constants", () => {
    expect(barrel.DIST_SPRINT_MAX).toBeDefined();
    expect(barrel.METRIC_MODES).toBeDefined();
  });

  it("exports facility constants", () => {
    expect(barrel.FACILITY_NAMES).toBeDefined();
    expect(barrel.FACILITY_TIER_LABELS).toBeDefined();
  });
});
