import { describe, it, expect } from "vitest";
import { AI_RISK_TOLERANCE_CONSERVATIVE, DEFAULT_SUBSYSTEM_WEIGHT, NPC_HORSE_COUNT_ELITE_MIN } from "@/domains/agents/model/aiConstants";
import { AUCTION_AGGRESSIVE_PREMIUM, AUCTION_RESERVE_ELITE, DEFAULT_PLAYER_RESERVE_RATIO } from "@/domains/auction/model/auctionConstants";
import { AUTOSIM_DAYS_OPTIONS, DAYS_PER_WEEK, DAYS_PER_YEAR } from "@/domains/calendar/model/calendarConstants";
import { FACILITY_NAMES, FACILITY_TIER_LABELS } from "@/domains/facilities/model/facilityTypes";
import { INJURY_PRONENESS_LOW_THRESHOLD, INJURY_RECOVERY_MIN, INJURY_SEVERITY_THRESHOLD } from "@/domains/health/model/healthInjuryConstants";
import { AGE_RETIREMENT_THRESHOLD, GRADE_S_THRESHOLD, STAT_SCALE_MAX } from "@/domains/horse/model/horseStatConstants";
import { NEWS_FLAVOR_DAILY_PROBABILITY, NEWS_HIGH_IMPORTANCE_PRICE_THRESHOLD } from "@/domains/inbox/model/newsConstants";
import { PRIZE_SPLIT, STARTING_CASH, UPKEEP_PER_HORSE } from "@/domains/market/model/economicConstants";
import { FAME_GAIN_G1_WIN, HALL_OF_FAME_FAME_THRESHOLD, MAX_FAME } from "@/domains/prestige/model/fameConstants";
import { DEFAULT_DT, TOP_SPEED_CEILING } from "@/domains/race/model/engine/constants";
import { DEFAULT_FIELD_SIZE, ENTRY_MAIDEN, MINIMUM_RACE_ENTRIES, PURSE_STAKES, RACE_GRADES } from "@/domains/race/model/raceClassificationConstants";
import { FOAL_BREAKING_IN_DAY, MAX_HORSES_PER_STABLE_PER_RACE, MIN_ENERGY_TO_ENTER } from "@/domains/race/model/raceEntryConstants";
import { BEYER_MIN, BEYER_NULL_SENTINEL, PHOTO_FINISH_THRESHOLD_SECONDS, POSITION_WIN, SIMULATION_MAX_STEPS_PER_FRAME, TOP_FINISH_POSITION } from "@/domains/race/model/raceSimulationConstants";
import { DEFAULT_RECOVERY_POINTS, ENERGY_LOW_THRESHOLD, ENERGY_MAX } from "@/domains/training/model/energyRecoveryConstants";
import { DASHBOARD_NEWS_FEED_LIMIT, DASHBOARD_UPCOMING_RACES_LIMIT, STANDINGS_RANGE_SHORT_DAYS } from "@/shared/constants/dashboardConstants";
import { DIST_SPRINT_MAX, METRIC_MODES } from "@/shared/constants/regionalConstants";
import { HALL_OF_FAME_MAX_SIZE, RACE_HISTORY_LIMIT_LOW, RECENT_RACES_MAX_COUNT } from "@/shared/constants/storageLimitsConstants";
import { TOOLTIP_DELAY_MS } from "@/shared/constants/uiConstants";

describe("barrel exports — all domain files re-exported", () => {
  it("exports economic constants", () => {
    expect(PRIZE_SPLIT).toBeDefined();
    expect(STARTING_CASH).toBeDefined();
    expect(UPKEEP_PER_HORSE).toBeDefined();
  });

  it("exports auction constants", () => {
    expect(AUCTION_AGGRESSIVE_PREMIUM).toBeDefined();
    expect(DEFAULT_PLAYER_RESERVE_RATIO).toBeDefined();
    expect(AUCTION_RESERVE_ELITE).toBeDefined();
  });

  it("exports raceClassification constants", () => {
    expect(ENTRY_MAIDEN).toBeDefined();
    expect(PURSE_STAKES).toBeDefined();
    expect(RACE_GRADES).toBeDefined();
    expect(DEFAULT_FIELD_SIZE).toBeDefined();
    expect(MINIMUM_RACE_ENTRIES).toBeDefined();
  });

  it("exports raceSimulation constants", () => {
    expect(PHOTO_FINISH_THRESHOLD_SECONDS).toBeDefined();
    expect(BEYER_MIN).toBeDefined();
    expect(POSITION_WIN).toBeDefined();
    expect(TOP_FINISH_POSITION).toBeDefined();
    expect(BEYER_NULL_SENTINEL).toBeDefined();
    expect(SIMULATION_MAX_STEPS_PER_FRAME).toBeDefined();
  });

  it("exports fame constants", () => {
    expect(MAX_FAME).toBeDefined();
    expect(FAME_GAIN_G1_WIN).toBeDefined();
    expect(HALL_OF_FAME_FAME_THRESHOLD).toBeDefined();
  });

  it("exports energyRecovery constants", () => {
    expect(ENERGY_LOW_THRESHOLD).toBeDefined();
    expect(ENERGY_MAX).toBeDefined();
    expect(DEFAULT_RECOVERY_POINTS).toBeDefined();
  });

  it("exports horseStat constants", () => {
    expect(GRADE_S_THRESHOLD).toBeDefined();
    expect(STAT_SCALE_MAX).toBeDefined();
    expect(AGE_RETIREMENT_THRESHOLD).toBeDefined();
  });

  it("exports healthInjury constants", () => {
    expect(INJURY_RECOVERY_MIN).toBeDefined();
    expect(INJURY_SEVERITY_THRESHOLD).toBeDefined();
    expect(INJURY_PRONENESS_LOW_THRESHOLD).toBeDefined();
  });

  it("exports ai constants", () => {
    expect(AI_RISK_TOLERANCE_CONSERVATIVE).toBeDefined();
    expect(NPC_HORSE_COUNT_ELITE_MIN).toBeDefined();
    expect(DEFAULT_SUBSYSTEM_WEIGHT).toBeDefined();
  });

  it("exports raceEntry constants", () => {
    expect(MAX_HORSES_PER_STABLE_PER_RACE).toBeDefined();
    expect(MIN_ENERGY_TO_ENTER).toBeDefined();
    expect(FOAL_BREAKING_IN_DAY).toBeDefined();
  });

  it("exports news constants", () => {
    expect(NEWS_HIGH_IMPORTANCE_PRICE_THRESHOLD).toBeDefined();
    expect(NEWS_FLAVOR_DAILY_PROBABILITY).toBeDefined();
  });

  it("exports dashboard constants", () => {
    expect(DASHBOARD_UPCOMING_RACES_LIMIT).toBeDefined();
    expect(DASHBOARD_NEWS_FEED_LIMIT).toBeDefined();
    expect(STANDINGS_RANGE_SHORT_DAYS).toBeDefined();
  });

  it("exports calendar constants", () => {
    expect(DAYS_PER_WEEK).toBeDefined();
    expect(DAYS_PER_YEAR).toBeDefined();
    expect(AUTOSIM_DAYS_OPTIONS).toBeDefined();
  });

  it("exports storageLimits constants", () => {
    expect(HALL_OF_FAME_MAX_SIZE).toBeDefined();
    expect(RECENT_RACES_MAX_COUNT).toBeDefined();
    expect(RACE_HISTORY_LIMIT_LOW).toBeDefined();
  });

  it("exports raceEngine constants", () => {
    expect(DEFAULT_DT).toBeDefined();
    expect(TOP_SPEED_CEILING).toBeDefined();
  });

  it("exports inbox constants", () => {
    expect(TOOLTIP_DELAY_MS).toBeDefined();
  });

  it("exports regional constants", () => {
    expect(DIST_SPRINT_MAX).toBeDefined();
    expect(METRIC_MODES).toBeDefined();
  });

  it("exports facility constants", () => {
    expect(FACILITY_NAMES).toBeDefined();
    expect(FACILITY_TIER_LABELS).toBeDefined();
  });
});
