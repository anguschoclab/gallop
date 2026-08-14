import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { AwardsTab } from "@/components/honors/AwardsTab";
import { CATEGORY_DESCRIPTIONS } from "@/core/awards/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: any) => (
    <a
      href={to as string}
      data-to={to as string}
      data-params={params ? JSON.stringify(params) : ""}
    >
      {children}
    </a>
  ),
}));

describe("AwardsTab", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Awards header and key section titles", () => {
    renderWithStore(<AwardsTab />, {
      day: 100,
      awards: [],
      awardCeremonyInvitations: [],
      seasonRecords: [],
    } as any);

    expect(screen.getByText("Awards")).toBeTruthy();
    expect(screen.getByText("Award Ceremony Schedule")).toBeTruthy();
    expect(screen.getByText("G1 Race Winners")).toBeTruthy();
    expect(screen.getByText("About Regional Awards")).toBeTruthy();
  });

  it("renders all four regional schedule entries", () => {
    renderWithStore(<AwardsTab />, {
      day: 100,
      awards: [],
      awardCeremonyInvitations: [],
      seasonRecords: [],
    } as any);

    expect(screen.getAllByText(/North America/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Europe/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Asia-Pacific/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/South America/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders CATEGORY_DESCRIPTIONS text in AboutAwardsCard", () => {
    renderWithStore(<AwardsTab />, {
      day: 100,
      awards: [],
      awardCeremonyInvitations: [],
      seasonRecords: [],
    } as any);

    // Check that at least one description from CATEGORY_DESCRIPTIONS appears
    expect(screen.getByText(/most prestigious award/i)).toBeTruthy();
  });
});
