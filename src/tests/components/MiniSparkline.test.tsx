import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MiniSparkline } from "@/components/stable/MiniSparkline";

describe("MiniSparkline", () => {
  it("renders an svg with a polyline when data has >= 2 points", () => {
    const { container } = render(<MiniSparkline data={[10, 20, 30, 40]} color="#ff0000" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    const polyline = container.querySelector("polyline");
    expect(polyline).toBeTruthy();
  });

  it("renders nothing when data has < 2 points", () => {
    const { container } = render(<MiniSparkline data={[10]} color="#ff0000" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeNull();
  });

  it("applies the color to the polyline stroke", () => {
    const { container } = render(<MiniSparkline data={[10, 20, 30]} color="#00ff00" />);
    const polyline = container.querySelector("polyline");
    expect(polyline?.getAttribute("stroke")).toBe("#00ff00");
  });

  it("renders nothing for empty data", () => {
    const { container } = render(<MiniSparkline data={[]} color="#ff0000" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeNull();
  });
});
