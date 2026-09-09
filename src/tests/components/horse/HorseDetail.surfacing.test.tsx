import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { createRouterMock } from "@/test-utils/routerMock";

vi.mock("@tanstack/react-router", () => createRouterMock());

import { HorseDetail } from "@/components/routes/HorseDetail";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Horse } from "@/game/types";

describe("HorseDetail surfacing", () => {
  const testHorse: Horse = createTestHorse({
    id: "horse-test-detail",
    name: "Thunder Bolt",
    age: 4,
    gender: "colt",
    energy: 85,
    potential: 90,
    stats: {
      speed: 92,
      stamina: 88,
      acceleration: 85,
      temperament: 80,
      conformation: 85,
      consistency: 90,
    },
    insurancePolicy: {
      type: "comprehensive",
      premiumPerDay: 100,
      coveragePercent: 0.75,
      activeSinceDay: 1,
    },
  });

  it("renders horse detail with insurance and strategy links", () => {
    const { container } = renderWithStore(<HorseDetail horseId="horse-test-detail" />, {
      horses: {
        "horse-test-detail": testHorse,
      },
    });

    expect(container).toBeDefined();
    expect(screen.getAllByText(/Thunder Bolt/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Campaign Strategy/i)).toBeDefined();
    expect(screen.getAllByText(/Insurance/i).length).toBeGreaterThan(0);
  });
});
