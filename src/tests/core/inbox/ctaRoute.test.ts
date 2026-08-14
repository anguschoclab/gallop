import { describe, it, expect } from "vitest";
import { interpolateCtaRoute } from "@/core/inbox/ctaRoute";

describe("interpolateCtaRoute", () => {
  it("interpolates a single $param", () => {
    expect(interpolateCtaRoute("/stable/$horseId", { horseId: "h-123" })).toBe("/stable/h-123");
  });

  it("interpolates multiple params", () => {
    expect(
      interpolateCtaRoute("/race/$raceId/entry/$horseId", {
        raceId: "r1",
        horseId: "h2",
      }),
    ).toBe("/race/r1/entry/h2");
  });

  it("returns route as-is when no params provided", () => {
    expect(interpolateCtaRoute("/inbox")).toBe("/inbox");
  });

  it("returns route as-is when params is undefined", () => {
    expect(interpolateCtaRoute("/stable/$horseId", undefined)).toBe("/stable/");
  });

  it("replaces missing param value with empty string", () => {
    expect(interpolateCtaRoute("/stable/$horseId", {})).toBe("/stable/");
  });

  it("handles route with no $params and params object provided", () => {
    expect(interpolateCtaRoute("/inbox", { horseId: "h1" })).toBe("/inbox");
  });

  it("handles consecutive params", () => {
    expect(interpolateCtaRoute("/$a/$b/$c", { a: "x", b: "y", c: "z" })).toBe("/x/y/z");
  });
});
