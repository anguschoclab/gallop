import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { UrgentMessagesStrip } from "@/components/dashboard/UrgentMessagesStrip";
import { createTestHorse } from "@/tests/helpers";

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

describe("UrgentMessagesStrip — entity linking", () => {
  it("renders message body with NewsContent auto-detection", () => {
    const horse = createTestHorse({ id: "h1", name: "Thunder Strike", ownership: { type: "player" } });
    seedStore({
      ...createDefaultGameState(),
      horses: { [horse.id]: horse },
    });

    const messages = [
      {
        id: "m1",
        title: "Race Result",
        body: "Thunder Strike won the Grand Stakes today",
        priority: "normal" as const,
      },
    ];

    const { container } = render(<UrgentMessagesStrip messages={messages} />);
    const links = container.querySelectorAll("a[to='/stable/$horseId']");
    expect(links.length).toBeGreaterThanOrEqual(1);
  });
});
