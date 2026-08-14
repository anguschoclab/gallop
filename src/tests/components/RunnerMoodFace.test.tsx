import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { RunnerMoodFace } from "@/components/race/RunnerMoodFace";
import type { RunnerMood } from "@/core/race/runnerConditions";

function mkMood(overrides: Partial<RunnerMood> = {}): RunnerMood {
  return {
    score: 60,
    face: "neutral",
    label: "Coping",
    signals: [],
    ...overrides,
  } as RunnerMood;
}

async function openTooltip(container: HTMLElement) {
  const trigger = container.querySelector("span[aria-label]");
  expect(trigger).toBeTruthy();
  fireEvent.focus(trigger!);
  await waitFor(() => {
    const wrappers = document.body.querySelectorAll("[data-radix-popper-content-wrapper]");
    expect(wrappers.length).toBeGreaterThan(0);
  });
}

function tooltipRoot(): HTMLElement {
  const wrappers = document.body.querySelectorAll("[data-radix-popper-content-wrapper]");
  const wrapper = wrappers[wrappers.length - 1] as HTMLElement;
  return wrapper.querySelector("div[data-side]") as HTMLElement;
}

function queryAll(root: HTMLElement, selector: string): Element[] {
  const hidden = root.querySelector('[role="tooltip"]');
  const all = Array.from(root.querySelectorAll(selector));
  return all.filter((el) => !hidden || !hidden.contains(el));
}

function query(root: HTMLElement, selector: string): Element | null {
  const filtered = queryAll(root, selector);
  return filtered.length > 0 ? filtered[0] : null;
}

describe("RunnerMoodFace — tooltip sub-signals", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("renders each signal label in the tooltip", async () => {
    const mood = mkMood({
      score: 73,
      face: "happy",
      label: "Happy",
      signals: [
        { label: "Handy on the pace", contribution: 18 },
        { label: "Travelling strongly", contribution: 15 },
      ],
    });
    const { container } = render(<RunnerMoodFace mood={mood} horseName="Test" />);
    await openTooltip(container);
    const root = tooltipRoot();
    const labels = queryAll(root, '[data-testid="mood-signal-label"]');
    expect(labels).toHaveLength(2);
    expect(labels[0].textContent).toBe("Handy on the pace");
    expect(labels[1].textContent).toBe("Travelling strongly");
  });

  it("renders signed contributions next to each label", async () => {
    const mood = mkMood({
      score: 58,
      face: "neutral",
      label: "Coping",
      signals: [
        { label: "Handy on the pace", contribution: 18 },
        { label: "Stranded off the lead", contribution: -20 },
      ],
    });
    const { container } = render(<RunnerMoodFace mood={mood} horseName="Test" />);
    await openTooltip(container);
    const root = tooltipRoot();
    const contributions = queryAll(root, '[data-testid="mood-signal-contribution"]');
    expect(contributions).toHaveLength(2);
    expect(contributions[0].textContent).toBe("+18");
    expect(contributions[1].textContent).toBe("-20");
  });

  it("shows minus prefix for negative contributions", async () => {
    const mood = mkMood({
      score: 40,
      face: "unhappy",
      label: "Unhappy",
      signals: [{ label: "Distressed", contribution: -28 }],
    });
    const { container } = render(<RunnerMoodFace mood={mood} horseName="Test" />);
    await openTooltip(container);
    const root = tooltipRoot();
    const contributions = queryAll(root, '[data-testid="mood-signal-contribution"]');
    expect(contributions[0].textContent).toMatch(/-28/);
  });

  it("shows plus prefix for positive contributions", async () => {
    const mood = mkMood({
      score: 78,
      face: "happy",
      label: "Happy",
      signals: [{ label: "Handy on the pace", contribution: 18 }],
    });
    const { container } = render(<RunnerMoodFace mood={mood} horseName="Test" />);
    await openTooltip(container);
    const root = tooltipRoot();
    const contributions = queryAll(root, '[data-testid="mood-signal-contribution"]');
    expect(contributions[0].textContent).toBe("+18");
  });

  it("renders the computed total in the total line", async () => {
    const mood = mkMood({
      score: 73,
      face: "happy",
      label: "Happy",
      signals: [{ label: "Handy on the pace", contribution: 18 }],
    });
    const { container } = render(<RunnerMoodFace mood={mood} horseName="Test" />);
    await openTooltip(container);
    const root = tooltipRoot();
    const total = query(root, '[data-testid="mood-total"]');
    expect(total).toBeTruthy();
    expect(total!.textContent).toContain("73");
    expect(total!.textContent).toContain("100");
  });

  it("renders no signal items but still shows total when signals is empty", async () => {
    const mood = mkMood({ score: 60, face: "neutral", label: "Coping", signals: [] });
    const { container } = render(<RunnerMoodFace mood={mood} horseName="Test" />);
    await openTooltip(container);
    const root = tooltipRoot();
    expect(queryAll(root, '[data-testid="mood-signal"]')).toHaveLength(0);
    expect(query(root, '[data-testid="mood-total"]')).toBeTruthy();
  });

  it("header shows mood label and score", async () => {
    const mood = mkMood({
      score: 73,
      face: "happy",
      label: "Happy",
      signals: [{ label: "Handy on the pace", contribution: 18 }],
    });
    const { container } = render(<RunnerMoodFace mood={mood} horseName="Test" />);
    await openTooltip(container);
    const root = tooltipRoot();
    const header = query(root, "p.text-xs");
    expect(header).toBeTruthy();
    expect(header!.textContent).toContain("Happy");
    expect(header!.textContent).toContain("73/100");
  });

  it("aria-label on trigger includes mood label and score", () => {
    const mood = mkMood({
      score: 73,
      face: "happy",
      label: "Happy",
      signals: [{ label: "Handy on the pace", contribution: 18 }],
    });
    const { container } = render(<RunnerMoodFace mood={mood} horseName="Test" />);
    const trigger = container.querySelector("span[aria-label]");
    expect(trigger?.getAttribute("aria-label")).toContain("Happy");
    expect(trigger?.getAttribute("aria-label")).toContain("73/100");
  });

  it("applies tooltipClassName to the tooltip content", async () => {
    const mood = mkMood({
      score: 73,
      face: "happy",
      label: "Happy",
      signals: [{ label: "Handy on the pace", contribution: 18 }],
    });
    const { container } = render(
      <RunnerMoodFace mood={mood} horseName="Test" tooltipClassName="z-[60]" />,
    );
    await openTooltip(container);
    const root = tooltipRoot();
    expect(root.className).toContain("z-[60]");
  });
});
