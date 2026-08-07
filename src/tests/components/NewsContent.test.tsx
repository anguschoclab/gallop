import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { NewsContent } from "@/components/narrative/NewsContent";
import { createTestHorse, createTestJockey, createTestStable } from "@/tests/helpers";
import type { Race } from "@/core/race/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, string>;
  }) => createElement("a", { to, "data-params": JSON.stringify(params) }, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

function mkRace(id: string, name: string): Race {
  return {
    id,
    name,
    day: 50,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 50000,
    fieldSize: 8,
    entries: [],
    resolved: false,
  } as unknown as Race;
}

describe("NewsContent", () => {
  it("renders plain text with no entities as a span", () => {
    seedStore({ ...createDefaultGameState() });
    const { container } = render(<NewsContent text="No entities here" />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toBe("No entities here");
  });

  it("renders horse name as a Link to /stable/$horseId", () => {
    const horse = createTestHorse({ id: "h1", name: "Thunder Strike" });
    seedStore({ ...createDefaultGameState(), horses: { [horse.id]: horse } });
    const { container } = render(<NewsContent text="Thunder Strike won today" />);
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("to")).toBe("/stable/$horseId");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ horseId: "h1" }));
    expect(link?.textContent).toBe("Thunder Strike");
  });

  it("renders jockey name as a Link to /jockey/$jockeyId", () => {
    const jockey = createTestJockey({ id: "j1", name: "Frankie Dettori" });
    seedStore({ ...createDefaultGameState(), jockeys: [jockey] });
    const { container } = render(<NewsContent text="Frankie Dettori rode well" />);
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("to")).toBe("/jockey/$jockeyId");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ jockeyId: "j1" }));
  });

  it("renders stable name as a Link to /npc-stables/$stableId", () => {
    const stable = createTestStable({ id: "npc1", name: "Godolphin" });
    seedStore({ ...createDefaultGameState(), npcStables: [stable] });
    const { container } = render(<NewsContent text="Godolphin entered three horses" />);
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("to")).toBe("/npc-stables/$stableId");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ stableId: "npc1" }));
  });

  it("renders race name as a Link to /race/$raceId", () => {
    const race = mkRace("r1", "Grand National");
    seedStore({ ...createDefaultGameState(), races: { [race.id]: race } });
    const { container } = render(<NewsContent text="The Grand National was held today" />);
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("to")).toBe("/race/$raceId");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ raceId: "r1" }));
  });

  it("links multiple entities in the same text", () => {
    const horse = createTestHorse({ id: "h1", name: "Lightning" });
    const race = mkRace("r1", "Derby");
    seedStore({
      ...createDefaultGameState(),
      horses: { [horse.id]: horse },
      races: { [race.id]: race },
    });
    const { container } = render(<NewsContent text="Lightning won the Derby" />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(2);
  });

  it("disables auto-detection when autoDetect=false", () => {
    const horse = createTestHorse({ id: "h1", name: "Thunder" });
    seedStore({ ...createDefaultGameState(), horses: { [horse.id]: horse } });
    const { container } = render(<NewsContent text="Thunder won" autoDetect={false} />);
    expect(container.querySelector("a")).toBeNull();
  });

  it("uses explicit links when provided", () => {
    seedStore({ ...createDefaultGameState() });
    const { container } = render(
      <NewsContent
        text="Mystery Horse won"
        links={[{ type: "horse", id: "h-explicit", name: "Mystery Horse" }]}
      />,
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("to")).toBe("/stable/$horseId");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ horseId: "h-explicit" }));
  });
});
