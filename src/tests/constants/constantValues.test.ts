import { describe, it, expect } from "vitest";
import * as barrel from "@/constants";

describe("constant values preserved after migration", () => {
  it("economic constants retain correct values", () => {
    expect(barrel.PRIZE_SPLIT).toEqual([0.6, 0.25, 0.1, 0.05]);
    expect(barrel.GRADED_PRIZE_SPLIT).toEqual([0.7, 0.2, 0.075, 0.025]);
    expect(barrel.STARTING_CASH).toBe(5000);
    expect(barrel.UPKEEP_PER_HORSE).toBe(50);
    expect(barrel.CONSIGNMENT_COMMISSION).toBe(0.06);
  });

  it("auction constants retain correct values", () => {
    expect(barrel.AUCTION_AGGRESSIVE_PREMIUM).toBe(0.3);
    expect(barrel.DEFAULT_PLAYER_RESERVE_RATIO).toBe(0.7);
    expect(barrel.AUCTION_RESERVE_ELITE).toBe(0.85);
  });

  it("raceClassification constants retain correct values", () => {
    expect(barrel.ENTRY_MAIDEN).toBe(100);
    expect(barrel.PURSE_STAKES).toBe(18000);
    expect(barrel.RACE_GRADES).toEqual(["G1", "G2", "G3"]);
    expect(barrel.DEFAULT_FIELD_SIZE).toBe(14);
    expect(barrel.MINIMUM_RACE_ENTRIES).toBe(2);
  });

  it("raceSimulation constants retain correct values", () => {
    expect(barrel.PHOTO_FINISH_THRESHOLD_SECONDS).toBe(0.05);
    expect(barrel.BEYER_MIN).toBe(30);
    expect(barrel.POSITION_WIN).toBe(1);
    expect(barrel.POSITION_PLACE).toBe(2);
    expect(barrel.POSITION_SHOW).toBe(3);
    expect(barrel.TOP_FINISH_POSITION).toBe(3);
    expect(barrel.BEYER_NULL_SENTINEL).toBe(-Infinity);
    expect(barrel.SIMULATION_MAX_STEPS_PER_FRAME).toBe(64);
  });

  it("fame constants retain correct values", () => {
    expect(barrel.MAX_FAME).toBe(100);
    expect(barrel.FAME_GAIN_G1_WIN).toBe(20);
    expect(barrel.HALL_OF_FAME_MIN_G1_WINS).toBe(3);
  });

  it("energyRecovery constants retain correct values", () => {
    expect(barrel.ENERGY_LOW_THRESHOLD).toBe(40);
    expect(barrel.ENERGY_MAX).toBe(100);
    expect(barrel.DEFAULT_RECOVERY_POINTS).toBe(100);
  });

  it("horseStat constants retain correct values", () => {
    expect(barrel.GRADE_S_THRESHOLD).toBe(90);
    expect(barrel.STAT_SCALE_MAX).toBe(100);
    expect(barrel.STAT_SCALE_MIN).toBe(0);
    expect(barrel.AGE_RETIREMENT_THRESHOLD).toBe(6);
  });

  it("healthInjury constants retain correct values", () => {
    expect(barrel.INJURY_RECOVERY_MIN).toBe(60);
    expect(barrel.INJURY_SEVERITY_THRESHOLD).toBe(0.85);
    expect(barrel.INJURY_PRONENESS_LOW_THRESHOLD).toBe(0.04);
  });

  it("ai constants retain correct values", () => {
    expect(barrel.AI_RISK_TOLERANCE_CONSERVATIVE).toBe(35);
    expect(barrel.AI_STRATEGIC_HORIZON_DAYS).toBe(90);
    expect(barrel.DEFAULT_SUBSYSTEM_WEIGHT).toBe(1.0);
  });

  it("raceEntry constants retain correct values", () => {
    expect(barrel.MAX_HORSES_PER_STABLE_PER_RACE).toBe(2);
    expect(barrel.MIN_ENERGY_TO_ENTER).toBe(50);
    expect(barrel.FOAL_BREAKING_IN_DAY).toBe(18);
  });

  it("news constants retain correct values", () => {
    expect(barrel.NEWS_HIGH_IMPORTANCE_PRICE_THRESHOLD).toBe(500000);
    expect(barrel.NEWS_FLAVOR_DAILY_PROBABILITY).toBe(0.1);
  });

  it("dashboard constants retain correct values", () => {
    expect(barrel.DASHBOARD_UPCOMING_RACES_LIMIT).toBe(8);
    expect(barrel.DASHBOARD_NEWS_FEED_LIMIT).toBe(15);
    expect(barrel.STANDINGS_RANGE_SHORT_DAYS).toBe(7);
  });

  it("calendar constants retain correct values", () => {
    expect(barrel.DAYS_PER_WEEK).toBe(7);
    expect(barrel.DAYS_PER_YEAR).toBe(365);
    expect(barrel.SEASON_DAYS).toBe(30);
  });

  it("storageLimits constants retain correct values", () => {
    expect(barrel.HALL_OF_FAME_MAX_SIZE).toBe(200);
    expect(barrel.RECENT_RACES_MAX_COUNT).toBe(5);
    expect(barrel.RACE_HISTORY_LIMIT_LOW).toBe(10);
  });

  it("raceEngine constants retain correct values", () => {
    expect(barrel.DEFAULT_DT).toBe(0.1);
    expect(barrel.TOP_SPEED_CEILING).toBe(22);
  });
});
