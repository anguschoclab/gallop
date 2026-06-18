import { describe, it, expect } from "vitest";
import { Route } from "@/routes/gazette";

describe("/gazette route", () => {
  it("redirects to /briefing with tab=gazette", () => {
    try {
      Route.options.beforeLoad?.({} as any);
      expect.fail("beforeLoad should have thrown");
    } catch (error: any) {
      expect(error.options).toMatchObject({
        to: "/briefing",
        search: { tab: "gazette" },
      });
    }
  });
});
