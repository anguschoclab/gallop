import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { FacilityCategory } from "@/components/facilities/FacilityCategory";
import { Dumbbell } from "lucide-react";
import type { PlayerFacilities, FacilityType } from "@/core/facilities";
import { createFacility, FACILITY_NAMES } from "@/core/facilities";

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

describe("FacilityCategory — human-readable facility names", () => {
  it("renders 'Main Training Track' for main_track, not 'main track'", () => {
    renderWithStore(
      <FacilityCategory
        category="Physical Optimization"
        icon={Dumbbell}
        color="text-gold"
        types={["main_track", "starting_gates", "treadmill", "exercise_pool"]}
        facilities={makeFacilities()}
        cash={100000}
        onUpgrade={() => {}}
      />,
    );
    expect(screen.getByText("Main Training Track")).toBeDefined();
    expect(screen.queryByText("main track")).toBeNull();
  });

  it("renders 'Veterinary Clinic' for veterinary_clinic", () => {
    renderWithStore(
      <FacilityCategory
        category="Medical & Wellness"
        icon={Dumbbell}
        color="text-gold"
        types={["veterinary_clinic", "rehab_center", "spa", "nutrition_lab"]}
        facilities={makeFacilities()}
        cash={100000}
        onUpgrade={() => {}}
      />,
    );
    expect(screen.getByText("Veterinary Clinic")).toBeDefined();
  });

  it("does not render raw snake_case type strings as facility titles", () => {
    const { container } = renderWithStore(
      <FacilityCategory
        category="All"
        icon={Dumbbell}
        color="text-gold"
        types={[
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
        ]}
        facilities={makeFacilities()}
        cash={100000}
        onUpgrade={() => {}}
      />,
    );
    const titles = container.querySelectorAll(".text-sm.font-black.uppercase");
    const titleTexts = Array.from(titles).map((t) => t.textContent ?? "");
    for (const type of Object.keys(FACILITY_NAMES) as FacilityType[]) {
      for (const titleText of titleTexts) {
        expect(titleText).not.toBe(type);
      }
    }
  });
});
