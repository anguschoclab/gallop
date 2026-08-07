import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { createTestHorse } from "@/tests/helpers";
import { InboxPage } from "@/routes/inbox";

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
  createFileRoute: () => (opts: any) => opts,
}));

vi.mock("@/components/awards/CeremonyRsvpControls", () => ({
  InboxCeremonyRsvp: () => null,
}));

// We test the Inbox page body rendering by importing the component directly
// The route component uses useInbox which reads from the game store
describe("Inbox — entity linking", () => {
  it("renders message body with NewsContent auto-detection for horse names", async () => {
    const horse = createTestHorse({ id: "h1", name: "Thunder Strike", owned: true });
    seedStore({
      ...createDefaultGameState(),
      day: 55,
      horses: { [horse.id]: horse },
      inbox: [
        {
          id: "msg1",
          day: 50,
          title: "Race Result",
          body: "Thunder Strike won the big race",
          category: "race",
          priority: "info" as const,
          readAt: undefined,
        },
      ],
    });

    const { container } = render(createElement(InboxPage));
    const link = container.querySelector("a[to='/stable/$horseId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Thunder Strike");
  });
});
