/**
 * calendar.test.tsx
 *
 * Slice audit for /calendar/$regionId: the regional selector routes through a
 * validated $regionId param, invalid regions are rejected before render, and
 * any table headers carry scope.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

import { isValidRegion } from "@/domains/calendar/application/calendarFacade";

const route = readFileSync(
  join(__dirname, "..", "..", "routes", "calendar.$regionId.tsx"),
  "utf-8",
);

describe("Calendar regional selector", () => {
  it("validates region ids", () => {
    expect(isValidRegion("usa")).toBe(true);
    expect(isValidRegion("atlantis")).toBe(false);
  });

  it("guards invalid region params before render", () => {
    expect(route).toMatch(/isValidRegion\(params\.regionId\)/);
    expect(route).toMatch(/notFound|redirect/);
  });
});

describe("Calendar table conventions", () => {
  it("any <th> in calendar views carries scope", () => {
    const calendarUi = join(__dirname, "..", "..", "domains", "calendar", "ui");
    for (const file of readdirSync(calendarUi).filter((f) => f.endsWith(".tsx"))) {
      const src = readFileSync(join(calendarUi, file), "utf-8");
      for (const th of src.match(/<th[\s>][^>]*>/g) ?? []) {
        expect(th, `${file}: ${th}`).toContain("scope=");
      }
    }
  });
});
