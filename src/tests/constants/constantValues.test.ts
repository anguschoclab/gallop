import { describe, it, expect } from "vitest";
import { AI_RISK_TOLERANCE_CONSERVATIVE, AI_STRATEGIC_HORIZON_DAYS, DEFAULT_SUBSYSTEM_WEIGHT } from "@/domains/agents/model/aiConstants";
import { AUCTION_AGGRESSIVE_PREMIUM, AUCTION_RESERVE_ELITE, DEFAULT_PLAYER_RESERVE_RATIO } from "@/domains/auction/model/auctionConstants";
import { DAYS_PER_WEEK, DAYS_PER_YEAR, SEASON_DAYS } from "@/domains/calendar/model/calendarConstants";
import { INJURY_PRONENESS_LOW_THRESHOLD, INJURY_RECOVERY_MIN, INJURY_SEVERITY_THRESHOLD } from "@/domains/health/model/healthInjuryConstants";
import { AGE_RETIREMENT_THRESHOLD, GRADE_S_THRESHOLD, STAT_SCALE_MAX, STAT_SCALE_MIN } from "@/domains/horse/model/horseStatConstants";
import { NEWS_FLAVOR_DAILY_PROBABILITY, NEWS_HIGH_IMPORTANCE_PRICE_THRESHOLD } from "@/domains/inbox/model/newsConstants";
import { CONSIGNMENT_COMMISSION, GRADED_PRIZE_SPLIT, PRIZE_SPLIT, STARTING_CASH, UPKEEP_PER_HORSE } from "@/domains/market/model/economicConstants";
import { FAME_GAIN_G1_WIN, HALL_OF_FAME_MIN_G1_WINS, MAX_FAME } from "@/domains/prestige/model/fameConstants";
import { DEFAULT_DT, TOP_SPEED_CEILING } from "@/domains/race/model/engine/constants";
import { DEFAULT_FIELD_SIZE, ENTRY_MAIDEN, MINIMUM_RACE_ENTRIES, PURSE_STAKES, RACE_GRADES } from "@/domains/race/model/raceClassificationConstants";
import { FOAL_BREAKING_IN_DAY, MAX_HORSES_PER_STABLE_PER_RACE, MIN_ENERGY_TO_ENTER } from "@/domains/race/model/raceEntryConstants";
import { BEYER_MIN, BEYER_NULL_SENTINEL, PHOTO_FINISH_THRESHOLD_SECONDS, POSITION_PLACE, POSITION_SHOW, POSITION_WIN, SIMULATION_MAX_STEPS_PER_FRAME, TOP_FINISH_POSITION } from "@/domains/race/model/raceSimulationConstants";
import { DEFAULT_RECOVERY_POINTS, ENERGY_LOW_THRESHOLD, ENERGY_MAX } from "@/domains/training/model/energyRecoveryConstants";
import { DASHBOARD_NEWS_FEED_LIMIT, DASHBOARD_UPCOMING_RACES_LIMIT, STANDINGS_RANGE_SHORT_DAYS } from "@/shared/constants/dashboardConstants";
import { HALL_OF_FAME_MAX_SIZE, RACE_HISTORY_LIMIT_LOW, RECENT_RACES_MAX_COUNT } from "@/shared/constants/storageLimitsConstants";

describe("constant values preserved after migration", () => {
  it("economic constants retain correct values", () => {
    expect(PRIZE_SPLIT).toEqual([0.6, 0.25, 0.1, 0.05]);
    expect(GRADED_PRIZE_SPLIT).toEqual([0.7, 0.2, 0.075, 0.025]);
    expect(STARTING_CASH).toBe(5000);
    expect(UPKEEP_PER_HORSE).toBe(50);
    expect(CONSIGNMENT_COMMISSION).toBe(0.06);
  });

  it("auction constants retain correct values", () => {
    expect(AUCTION_AGGRESSIVE_PREMIUM).toBe(0.3);
    expect(DEFAULT_PLAYER_RESERVE_RATIO).toBe(0.7);
    expect(AUCTION_RESERVE_ELITE).toBe(0.85);
  });

  it("raceClassification constants retain correct values", () => {
    expect(ENTRY_MAIDEN).toBe(100);
    expect(PURSE_STAKES).toBe(18000);
    expect(RACE_GRADES).toEqual(["G1", "G2", "G3"]);
    expect(DEFAULT_FIELD_SIZE).toBe(14);
    expect(MINIMUM_RACE_ENTRIES).toBe(2);
  });

  it("raceSimulation constants retain correct values", () => {
    expect(PHOTO_FINISH_THRESHOLD_SECONDS).toBe(0.05);
    expect(BEYER_MIN).toBe(30);
    expect(POSITION_WIN).toBe(1);
    expect(POSITION_PLACE).toBe(2);
    expect(POSITION_SHOW).toBe(3);
    expect(TOP_FINISH_POSITION).toBe(3);
    expect(BEYER_NULL_SENTINEL).toBe(-Infinity);
    expect(SIMULATION_MAX_STEPS_PER_FRAME).toBe(64);
  });

  it("fame constants retain correct values", () => {
    expect(MAX_FAME).toBe(100);
    expect(FAME_GAIN_G1_WIN).toBe(20);
    expect(HALL_OF_FAME_MIN_G1_WINS).toBe(3);
  });

  it("energyRecovery constants retain correct values", () => {
    expect(ENERGY_LOW_THRESHOLD).toBe(40);
    expect(ENERGY_MAX).toBe(100);
    expect(DEFAULT_RECOVERY_POINTS).toBe(100);
  });

  it("horseStat constants retain correct values", () => {
    expect(GRADE_S_THRESHOLD).toBe(90);
    expect(STAT_SCALE_MAX).toBe(100);
    expect(STAT_SCALE_MIN).toBe(0);
    expect(AGE_RETIREMENT_THRESHOLD).toBe(6);
  });

  it("healthInjury constants retain correct values", () => {
    expect(INJURY_RECOVERY_MIN).toBe(60);
    expect(INJURY_SEVERITY_THRESHOLD).toBe(0.85);
    expect(INJURY_PRONENESS_LOW_THRESHOLD).toBe(0.04);
  });

  it("ai constants retain correct values", () => {
    expect(AI_RISK_TOLERANCE_CONSERVATIVE).toBe(35);
    expect(AI_STRATEGIC_HORIZON_DAYS).toBe(90);
    expect(DEFAULT_SUBSYSTEM_WEIGHT).toBe(1.0);
  });

  it("raceEntry constants retain correct values", () => {
    expect(MAX_HORSES_PER_STABLE_PER_RACE).toBe(2);
    expect(MIN_ENERGY_TO_ENTER).toBe(50);
    expect(FOAL_BREAKING_IN_DAY).toBe(18);
  });

  it("news constants retain correct values", () => {
    expect(NEWS_HIGH_IMPORTANCE_PRICE_THRESHOLD).toBe(500000);
    expect(NEWS_FLAVOR_DAILY_PROBABILITY).toBe(0.1);
  });

  it("dashboard constants retain correct values", () => {
    expect(DASHBOARD_UPCOMING_RACES_LIMIT).toBe(8);
    expect(DASHBOARD_NEWS_FEED_LIMIT).toBe(15);
    expect(STANDINGS_RANGE_SHORT_DAYS).toBe(7);
  });

  it("calendar constants retain correct values", () => {
    expect(DAYS_PER_WEEK).toBe(7);
    expect(DAYS_PER_YEAR).toBe(365);
    expect(SEASON_DAYS).toBe(30);
  });

  it("storageLimits constants retain correct values", () => {
    expect(HALL_OF_FAME_MAX_SIZE).toBe(200);
    expect(RECENT_RACES_MAX_COUNT).toBe(5);
    expect(RACE_HISTORY_LIMIT_LOW).toBe(10);
  });

  it("raceEngine constants retain correct values", () => {
    expect(DEFAULT_DT).toBe(0.1);
    expect(TOP_SPEED_CEILING).toBe(22);
  });
});
