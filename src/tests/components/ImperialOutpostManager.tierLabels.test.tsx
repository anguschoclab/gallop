import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { ImperialOutpostManager } from "@/components/facilities/ImperialOutpostManager";

describe("ImperialOutpostManager — tier label display", () => {
  it("does NOT render raw 'basic', 'standard', 'premium', or 'elite' in badge text", () => {
    const { container } = renderWithStore(<ImperialOutpostManager />);
    const badges = container.querySelectorAll(".bg-t700");
    badges.forEach((badge) => {
      const text = badge.textContent?.toLowerCase() ?? "";
      expect(text).not.toBe("basic");
      expect(text).not.toBe("standard");
      expect(text).not.toBe("premium");
      expect(text).not.toBe("elite");
    });
  });

  it("renders Tier 0 pattern in facility slot badges", () => {
    const { container } = renderWithStore(<ImperialOutpostManager />);
    const badges = container.querySelectorAll(".bg-t700");
    const tierBadges = Array.from(badges).filter((b) =>
      /Tier 0/i.test(b.textContent ?? ""),
    );
    expect(tierBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Tier 04 instead of Elite (Level 4)", () => {
    renderWithStore(<ImperialOutpostManager />);
    expect(screen.queryByText(/Elite \(Level 4\)/i)).toBeNull();
    expect(screen.getAllByText(/Tier 04/i).length).toBeGreaterThanOrEqual(1);
  });
});
