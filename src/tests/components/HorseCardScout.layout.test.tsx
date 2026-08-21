import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { Horse } from "@/game/types";
import type { useHorseCard } from "@/hooks/horse/useHorseCard";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

import { HorseCardScout } from "@/components/horse/HorseCardScout";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    energy: 80,
    peakingIndex: 0,
    form: 50,
    potential: 75,
    fame: 10,
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      temperament: 70,
      durability: 70,
      consistency: 70,
    } as any,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    distanceAptitude: 1600,
    raceHistory: [],
    ownership: { type: "player" },
    silk: { primary: "#ff0000", secondary: "#00ff00" } as any,
    ...overrides,
  }) as Horse;

const mkHookData = (
  overrides: Partial<ReturnType<typeof useHorseCard>> = {},
): ReturnType<typeof useHorseCard> => ({
  ovr: 70,
  simpleHorseCards: false,
  scoutStatus: { label: "Fully Scouted", icon: "✓", color: "text-success" } as any,
  displayStats: {
    stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
    overallEstimate: 70,
  } as any,
  genderColor: "text-blue-400",
  gradeColor: () => "text-gold",
  sparklineData: [],
  ...overrides,
});

describe("HorseCardScout responsive layout", () => {
  it("horse name span has truncate class", () => {
    const horse = mkHorse();
    const { container } = render(<HorseCardScout horse={horse} hookData={mkHookData()} />);
    const nameSpan = container.querySelector("span.text-lg");
    expect(nameSpan).toBeTruthy();
    expect(nameSpan!.className).toContain("truncate");
  });

  it("name container div has min-w-0 class", () => {
    const horse = mkHorse();
    const { container } = render(<HorseCardScout horse={horse} hookData={mkHookData()} />);
    const nameContainer = container.querySelector(".space-y-1");
    expect(nameContainer).toBeTruthy();
    expect(nameContainer!.className).toContain("min-w-0");
  });

  it("header flex container has min-w-0 on left side", () => {
    const horse = mkHorse();
    const { container } = render(<HorseCardScout horse={horse} hookData={mkHookData()} />);
    const headerFlex = container.querySelector(".flex.items-start.gap-3");
    expect(headerFlex).toBeTruthy();
    const leftSide = headerFlex!.querySelector(".flex.items-center.gap-2");
    expect(leftSide).toBeTruthy();
    expect(leftSide!.className).toContain("min-w-0");
  });

  it("fan count is displayed when fanCount > 0", () => {
    const horse = mkHorse({ fanCount: 25000 });
    const { container } = render(<HorseCardScout horse={horse} hookData={mkHookData()} />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/25K|25,000|fans/i);
  });
});
