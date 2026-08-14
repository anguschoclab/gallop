import { describe, it, expect, afterEach } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { AwardsTab } from "@/components/honors/AwardsTab";

describe("AwardsTab", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Awards header and key section titles", () => {
    renderWithStore(<AwardsTab />, {
      day: 100,
      awards: [],
      awardCeremonyInvitations: [],
    } as any);

    expect(screen.getByText("Awards")).toBeTruthy();
    expect(screen.getByText("Award Ceremony Schedule")).toBeTruthy();
    expect(screen.getByText("About Regional Awards")).toBeTruthy();
  });

  it("renders all four regional schedule entries", () => {
    renderWithStore(<AwardsTab />, {
      day: 100,
      awards: [],
      awardCeremonyInvitations: [],
    } as any);

    expect(screen.getAllByText(/North America/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Europe/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Asia-Pacific/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/South America/i).length).toBeGreaterThanOrEqual(1);
  });
});
