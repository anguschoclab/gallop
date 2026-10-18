import { describe, it, expect, vi, afterEach } from "vitest";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { PlayerPrestigePanel } from "@/domains/prestige/ui/PlayerPrestigePanel";

describe("PlayerPrestigePanel", () => {
  const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  afterEach(() => errSpy.mockClear());

  it("renders tier marks without React key warnings", () => {
    renderWithStore(<PlayerPrestigePanel />);
    const keyWarnings = errSpy.mock.calls.filter((c) => String(c[0]).includes('unique "key" prop'));
    expect(keyWarnings).toEqual([]);
  });
});
