import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { HQOpsWidget } from "@/components/dashboard/HQOpsWidget";
import type { PlayerFacilities, FacilityType } from "@/core/facilities";
import { createFacility } from "@/core/facilities";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

function makeFacilities(): PlayerFacilities {
  const types: FacilityType[] = ["main_track", "barn", "exercise_pool"];
  const facilities = {} as PlayerFacilities;
  for (const t of types) {
    facilities[t] = createFacility(t, "basic", 1);
  }
  return facilities;
}

describe("HQOpsWidget — human-readable facility names", () => {
  it("renders FACILITY_NAMES for facility keys", () => {
    renderWithStore(<HQOpsWidget />, {
      facilities: makeFacilities(),
    });
    expect(screen.getByText("Main Training Track")).toBeDefined();
    expect(screen.queryByText("main_track")).toBeNull();
    expect(screen.queryByText("Main_track")).toBeNull();
  });

  it("does not render raw snake_case keys", () => {
    const { container } = renderWithStore(<HQOpsWidget />, {
      facilities: makeFacilities(),
    });
    const allText = container.textContent ?? "";
    expect(allText).not.toContain("main_track");
    expect(allText).not.toContain("exercise_pool");
  });
});
