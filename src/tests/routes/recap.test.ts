import { describe, it, expect } from "vitest";
import { Route } from "@/routes/recap";

describe("/recap route", () => {
  it("redirects to /briefing with tab=recap", () => {
    try {
      Route.options.beforeLoad?.({} as any);
      expect.fail("beforeLoad should have thrown");
    } catch (error: any) {
      expect(error.options).toMatchObject({
        to: "/briefing",
        search: { tab: "recap" },
      });
    }
  });
});
