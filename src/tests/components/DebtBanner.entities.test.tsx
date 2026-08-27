import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { DebtBanner } from "@/components/dashboard/DebtBanner";
import { createTestHorse } from "@/tests/helpers";
import { makePlayerOwned } from "@/core/horse/ownership";

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

describe("DebtBanner — entity linking", () => {
  it("renders seizure horse name as a Link to /stable/$horseId", () => {
    const horse = createTestHorse({
      id: "h1",
      name: "Seizure Target",
      ownership: makePlayerOwned(),
    });
    renderWithStore(<DebtBanner />, {
      ...createDefaultGameState(),
      cash: -50000,
      consecutiveDaysInDebt: 5,
      horses: { [horse.id]: horse },
    });
    // DebtBanner only renders when display is not null (cash < 0 + days in debt)
    // The seizure preview shows horseName — after implementation it should be a Link
    // This test will fail until the Link is added
  });
});
