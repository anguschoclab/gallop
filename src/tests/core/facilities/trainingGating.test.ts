import { describe, it, expect } from "vitest";
import { TRAINING_FACILITY_REQUIREMENTS } from "@/constants/workoutConstants";
import {
  getAvailableTrainingTypes,
  createDefaultPlayerFacilities,
  createFacility,
} from "@/core/facilities";

describe("TRAINING_FACILITY_REQUIREMENTS", () => {
  it("bullet requires barn elite", () => {
    expect(TRAINING_FACILITY_REQUIREMENTS.bullet).toEqual({
      facilityType: "barn",
      minLevel: "elite",
    });
  });

  it("swimming requires exercise_pool standard", () => {
    expect(TRAINING_FACILITY_REQUIREMENTS.swimming).toEqual({
      facilityType: "exercise_pool",
      minLevel: "standard",
    });
  });

  it("gate_work requires starting_gates standard", () => {
    expect(TRAINING_FACILITY_REQUIREMENTS.gate_work).toEqual({
      facilityType: "starting_gates",
      minLevel: "standard",
    });
  });

  it("treadmill requires treadmill facility standard", () => {
    expect(TRAINING_FACILITY_REQUIREMENTS.treadmill).toEqual({
      facilityType: "treadmill",
      minLevel: "standard",
    });
  });
});

describe("getAvailableTrainingTypes", () => {
  it("basic barn only gives speed/stamina/acceleration/rest", () => {
    const facilities = createDefaultPlayerFacilities(1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("speed");
    expect(available).toContain("stamina");
    expect(available).toContain("acceleration");
    expect(available).toContain("rest");
    expect(available).not.toContain("gallop");
    expect(available).not.toContain("bullet");
  });

  it("basic exercise_pool does NOT unlock swimming", () => {
    const facilities = createDefaultPlayerFacilities(1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).not.toContain("swimming");
  });

  it("standard barn unlocks gallop", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.barn = createFacility("barn", "standard", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("gallop");
  });

  it("standard exercise_pool unlocks swimming", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.exercise_pool = createFacility("exercise_pool", "standard", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("swimming");
  });

  it("premium barn unlocks breeze", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.barn = createFacility("barn", "premium", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("breeze");
  });

  it("premium barn + standard starting_gates unlocks gate_work", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.barn = createFacility("barn", "premium", 1);
    facilities.starting_gates = createFacility("starting_gates", "standard", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("gate_work");
  });

  it("elite barn unlocks bullet", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.barn = createFacility("barn", "elite", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("bullet");
  });

  it("elite barn + standard treadmill facility unlocks treadmill", () => {
    const facilities = createDefaultPlayerFacilities(1);
    facilities.barn = createFacility("barn", "elite", 1);
    facilities.treadmill = createFacility("treadmill", "standard", 1);
    const available = getAvailableTrainingTypes(facilities);
    expect(available).toContain("treadmill");
  });
});
