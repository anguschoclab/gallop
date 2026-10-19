import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JargonTooltip, Jargon } from "@/shared/ui/JargonTooltip";
import { JargonTooltip as DomainJargonTooltip } from "@/domains/horse/ui/JargonTooltip";
import { JARGON_DEFINITIONS } from "@/shared/data/jargon";

describe("JargonTooltip", () => {
  it("renders the term with dotted-underline affordance for a known term", () => {
    render(<JargonTooltip term="Beyer" />);
    const trigger = screen.getByText("Beyer");
    expect(trigger.className).toContain("underline");
    expect(trigger.className).toContain("decoration-dotted");
    expect(trigger.className).toContain("cursor-help");
  });

  it("shows the definition in a tooltip on hover for a known term", async () => {
    const user = userEvent.setup();
    render(<JargonTooltip term="Beyer" />);
    await user.hover(screen.getByText("Beyer"));
    await waitFor(() => {
      const tooltips = document.body.querySelectorAll("[role='tooltip']");
      expect(tooltips.length).toBeGreaterThan(0);
    });
    const texts = Array.from(document.body.querySelectorAll("[role='tooltip']")).map(
      (t) => t.textContent,
    );
    expect(texts).toContain(JARGON_DEFINITIONS.Beyer);
  });

  it("gracefully degrades to plain text for an unknown term", () => {
    render(<JargonTooltip term="NotARealTerm" />);
    const el = screen.getByText("NotARealTerm");
    expect(el.className).not.toContain("underline");
    expect(el.className).not.toContain("cursor-help");
  });

  it("renders children instead of the raw term when provided", () => {
    render(<JargonTooltip term="OVR">overall rating</JargonTooltip>);
    expect(screen.getByText("overall rating")).toBeTruthy();
  });

  it("Jargon alias and legacy domain path resolve to the same component", () => {
    expect(Jargon).toBe(JargonTooltip);
    expect(DomainJargonTooltip).toBe(JargonTooltip);
  });
});
