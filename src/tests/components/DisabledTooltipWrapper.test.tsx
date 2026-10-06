import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DisabledTooltipWrapper } from "@/components/ui/DisabledTooltipWrapper";

describe("DisabledTooltipWrapper", () => {
  it("renders children directly when no reason is given", () => {
    render(
      <DisabledTooltipWrapper>
        <button>Click</button>
      </DisabledTooltipWrapper>,
    );
    const btn = screen.getByRole("button", { name: "Click" });
    expect(btn.parentElement?.tagName).not.toBe("SPAN");
  });

  it("wraps children in a focusable span when reason is set", () => {
    const { container } = render(
      <DisabledTooltipWrapper reason="Not available">
        <button disabled>Click</button>
      </DisabledTooltipWrapper>,
    );
    const span = container.querySelector("span[tabindex='0']");
    expect(span).not.toBeNull();
  });
});
