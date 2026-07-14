import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { FacilityCategory } from "@/components/facilities/FacilityCategory";
import { Dumbbell } from "lucide-react";
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

describe("FacilityCategory — tooltip wrapping", () => {
  it("renders Tier 0 badge text", () => {
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
    expect(screen.getAllByText(/Tier 0/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Regimens Unlocked label", () => {
    renderWithStore(
      <FacilityCategory
        category="Physical Optimization"
        icon={Dumbbell}
        color="text-gold"
        types={["main_track"]}
        facilities={makeFacilities()}
        cash={100000}
        onUpgrade={() => {}}
      />,
    );
    expect(screen.getAllByText(/Regimens Unlocked/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Commission Tier 0 button text", () => {
    renderWithStore(
      <FacilityCategory
        category="Physical Optimization"
        icon={Dumbbell}
        color="text-gold"
        types={["main_track"]}
        facilities={makeFacilities()}
        cash={100000}
        onUpgrade={() => {}}
      />,
    );
    expect(screen.getAllByText(/Commission Tier 0/i).length).toBeGreaterThanOrEqual(1);
  });

  it("wraps Tier badge in a tooltip trigger (cursor-help or decoration-dotted)", () => {
    const { container } = renderWithStore(
      <FacilityCategory
        category="Physical Optimization"
        icon={Dumbbell}
        color="text-gold"
        types={["main_track"]}
        facilities={makeFacilities()}
        cash={100000}
        onUpgrade={() => {}}
      />,
    );
    const tooltipTriggers = container.querySelectorAll(
      ".underline.decoration-dotted, .cursor-help",
    );
    expect(tooltipTriggers.length).toBeGreaterThanOrEqual(1);
  });
});
