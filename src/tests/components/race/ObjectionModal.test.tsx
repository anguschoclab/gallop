import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ObjectionModal } from "@/components/race/ObjectionModal";
import type { Race } from "@/game/types";

describe("ObjectionModal component", () => {
  const mockRace: Race = {
    id: "race-1",
    name: "Classic Cup",
    trackCondition: "fast",
    surface: "dirt",
    day: 10,
    result: [
      { horseId: "horse-1", position: 1, time: 110.2 },
      { horseId: "horse-2", position: 2, time: 110.25 },
    ],
    entries: [
      { horseId: "horse-1", jockeyId: "j-1" },
      { horseId: "horse-2", jockeyId: "j-2" },
    ],
  } as any;

  const horsesById: Record<string, any> = {
    "horse-1": { id: "horse-1", name: "Alpha Horse" },
    "horse-2": { id: "horse-2", name: "Beta Horse" },
  };

  it("renders modal when open with race details and candidate horses", () => {
    render(
      <ObjectionModal
        isOpen={true}
        onClose={vi.fn()}
        race={mockRace}
        horses={horsesById}
        reportingHorseId="horse-2"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText(/Lodge Stewards Inquiry/i)).toBeDefined();
    expect(screen.getByText(/Alpha Horse/i)).toBeDefined();
  });

  it("dispatches submission with chosen foul type and accused horse", () => {
    const onSubmit = vi.fn();
    render(
      <ObjectionModal
        isOpen={true}
        onClose={vi.fn()}
        race={mockRace}
        horses={horsesById}
        reportingHorseId="horse-2"
        onSubmit={onSubmit}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: /Submit Formal Objection/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "stewards_inquiry",
        raceId: "race-1",
        accusedHorseId: "horse-1",
        reportingHorseId: "horse-2",
      }),
    );
  });
});
