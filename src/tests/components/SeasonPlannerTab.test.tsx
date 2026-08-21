import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeasonPlannerTab } from "@/components/breeding/SeasonPlannerTab";

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, disabled }: any) => (
    <input
      type="checkbox"
      data-testid="checkbox"
      checked={checked ?? false}
      disabled={disabled}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

vi.mock("@/components/horse/HorseBits", () => ({
  NumericValue: ({ value }: any) => <span>{value}</span>,
}));

const mockMare = (id: string, name: string, overrides: any = {}) => ({
  id,
  name,
  gender: "mare",
  age: 5,
  hemisphere: "Northern",
  distanceAptitude: 1600,
  bruceLoweFamily: undefined,
  ownership: { type: "player" },
  lifecycleStatus: "active",
  ...overrides,
});

const mockStallion = (id: string, name: string, overrides: any = {}) => ({
  id,
  name,
  gender: "horse",
  age: 8,
  hemisphere: "Northern",
  ownership: { type: "npc", stableId: asNpcStableId("npc-stable-1") },
  stud: {
    atStud: true,
    standingFee: 5000,
    seasonBookings: 0,
    bookSize: 120,
    lifetimeFoals: 0,
    lifetimeStakesFoals: 0,
    lifetimeG1Foals: 0,
    retiredOnDay: 0,
  },
  ...overrides,
});

let mockState: any = {};

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector(mockState),
  useGameWithShallow: (selector: (s: any) => any) => selector(mockState),
}));

vi.mock("@/core/breeding/stallions", () => ({
  getAvailableStallions: (horses: any[]) => horses.filter((h) => h.stud?.atStud),
}));

vi.mock("@/core/breeding/sireSuggestions", () => ({
  suggestBestSires: (mare: any, stallions: any[], _day: number, limit?: number) => {
    if (!mare) return [];
    const filtered = stallions.filter((s) => s.hemisphere === mare.hemisphere);
    return filtered.slice(0, limit ?? 5).map((s) => ({
      stallion: s,
      compatibilityScore: 0.75,
      fee: 7000,
      reason: "Good match",
    }));
  },
}));

vi.mock("@/core/calendar/breedingCalendar", () => ({
  inBreedingSeason: (day: number, _hemisphere: string) => day >= 60 && day <= 180,
  nextBreedingSeasonStart: () => 200,
}));

vi.mock("@/core/horse/gender", () => ({
  isFemaleHorse: (gender: string) => gender === "mare" || gender === "filly",
}));

function setupState(overrides: any = {}) {
  mockState = {
    horses: {},
    pregnancies: [],
    savedMatingPlans: [],
    day: 100,
    cash: 500000,
    breedBatch: vi.fn(() => ({ ok: true, results: [] })),
    saveMatingPlan: vi.fn(() => ({ ok: true, planId: "plan-1" })),
    deleteMatingPlan: vi.fn(),
    getSavedMatingPlan: vi.fn(() => undefined),
    ...overrides,
  };
}

describe("SeasonPlannerTab", () => {
  it("renders empty state when no eligible mares", () => {
    setupState({ horses: {} });
    render(<SeasonPlannerTab />);
    expect(screen.getByText(/No eligible mares/i)).toBeTruthy();
  });

  it("renders mare rows for eligible mares", () => {
    setupState({
      horses: {
        mare1: mockMare("mare1", "Bella"),
        mare2: mockMare("mare2", "Luna"),
        sire1: mockStallion("sire1", "Thunder"),
      },
    });
    render(<SeasonPlannerTab />);
    expect(screen.getByText("Bella")).toBeTruthy();
    expect(screen.getByText("Luna")).toBeTruthy();
  });

  it("disables confirm button when season closed", () => {
    setupState({
      day: 200,
      horses: { mare1: mockMare("mare1", "Bella"), sire1: mockStallion("sire1", "Thunder") },
    });
    render(<SeasonPlannerTab />);
    expect(screen.getByText(/Breeding season is closed/i)).toBeTruthy();
  });

  it("disables confirm button when no assignments", () => {
    setupState({
      day: 100,
      horses: { mare1: mockMare("mare1", "Bella"), sire1: mockStallion("sire1", "Thunder") },
    });
    render(<SeasonPlannerTab />);
    const confirmBtn = screen.getByText(/Confirm All/i).closest("button");
    expect(confirmBtn?.disabled).toBe(true);
  });

  it("shows insufficient cash warning when can't afford", () => {
    setupState({
      day: 100,
      cash: 100,
      horses: {
        mare1: mockMare("mare1", "Bella"),
        sire1: mockStallion("sire1", "Thunder"),
      },
    });
    const { container } = render(<SeasonPlannerTab />);
    const selects = container.querySelectorAll('[data-testid="select"]');
    fireEvent.change(selects[0], { target: { value: "sire1" } });
    expect(screen.getByText(/Insufficient cash/i)).toBeTruthy();
  });

  it("auto-assign button is present and enabled during season", () => {
    setupState({
      day: 100,
      horses: { mare1: mockMare("mare1", "Bella"), sire1: mockStallion("sire1", "Thunder") },
    });
    render(<SeasonPlannerTab />);
    const autoBtn = screen.getByText(/Auto-Assign/i).closest("button");
    expect(autoBtn?.disabled).toBe(false);
  });

  it("save plan button is disabled when no assignments", () => {
    setupState({
      day: 100,
      horses: { mare1: mockMare("mare1", "Bella"), sire1: mockStallion("sire1", "Thunder") },
    });
    render(<SeasonPlannerTab />);
    const saveBtn = screen.getByText("Save Plan").closest("button");
    expect(saveBtn?.disabled).toBe(true);
  });

  it("clear button is disabled when no assignments", () => {
    setupState({
      day: 100,
      horses: { mare1: mockMare("mare1", "Bella"), sire1: mockStallion("sire1", "Thunder") },
    });
    render(<SeasonPlannerTab />);
    const clearBtn = screen.getByText(/Clear/i).closest("button");
    expect(clearBtn?.disabled).toBe(true);
  });
});
