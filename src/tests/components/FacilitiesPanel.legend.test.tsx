import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { FacilitiesPanel } from "@/components/facilities/FacilitiesPanel";
import type { PlayerFacilities, FacilityType } from "@/core/facilities";
import { createFacility } from "@/core/facilities";

function makeFacilities(): PlayerFacilities {
  const types: FacilityType[] = [
    "main_track",
    "barn",
    "exercise_pool",
    "treadmill",
    "veterinary_clinic",
    "starting_gates",
    "transport",
    "spa",
    "nutrition_lab",
    "rehab_center",
  ];
  const facilities = {} as PlayerFacilities;
  for (const t of types) {
    facilities[t] = createFacility(t, "basic", 1);
  }
  return facilities;
}

describe("FacilitiesPanel — tier legend", () => {
  it("renders Tier 01 through Tier 04 text", () => {
    renderWithStore(<FacilitiesPanel />, {
      facilities: makeFacilities(),
      cash: 100000,
    });
    expect(screen.getAllByText(/Tier 01/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Tier 02/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Tier 03/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Tier 04/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders 0% for Tier 01 bonus", () => {
    renderWithStore(<FacilitiesPanel />, {
      facilities: makeFacilities(),
      cash: 100000,
    });
    expect(screen.getAllByText(/0%/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders +10% for Tier 02 bonus", () => {
    renderWithStore(<FacilitiesPanel />, {
      facilities: makeFacilities(),
      cash: 100000,
    });
    expect(screen.getAllByText(/\+10%/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders +25% for Tier 03 bonus", () => {
    renderWithStore(<FacilitiesPanel />, {
      facilities: makeFacilities(),
      cash: 100000,
    });
    expect(screen.getAllByText(/\+25%/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders +40% for Tier 04 bonus", () => {
    renderWithStore(<FacilitiesPanel />, {
      facilities: makeFacilities(),
      cash: 100000,
    });
    expect(screen.getAllByText(/\+40%/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Max for Tier 04 upgrade cost", () => {
    renderWithStore(<FacilitiesPanel />, {
      facilities: makeFacilities(),
      cash: 100000,
    });
    expect(screen.getAllByText(/Max/i).length).toBeGreaterThanOrEqual(1);
  });
});
