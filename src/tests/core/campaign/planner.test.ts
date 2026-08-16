import { describe, it, expect } from "vitest";
import { updateCampaignAptitudes } from "@/core/campaign/planner";
import type { ConfirmedAptitudes } from "@/core/calendar/campaignTypes";

describe("updateCampaignAptitudes", () => {
  it("should increment surface and distance starts", () => {
    let apts: ConfirmedAptitudes = {
      surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
      distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
    };
    apts = updateCampaignAptitudes(apts, "Turf", 1200); // 1200 is sprint

    expect(apts.surfaceStarts.Turf).toBe(1);
    expect(apts.distanceBandStarts.sprint).toBe(1);
    expect(apts.surfaceConfirmed).toBeUndefined();
    expect(apts.distanceBandConfirmed).toBeUndefined();
  });

  it("should confirm surface after 3 starts with 60% majority", () => {
    let apts: ConfirmedAptitudes = {
      surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
      distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
    };
    apts = updateCampaignAptitudes(apts, "Turf", 1200);
    apts = updateCampaignAptitudes(apts, "Turf", 1200);
    apts = updateCampaignAptitudes(apts, "Dirt", 1200);

    expect(apts.surfaceStarts.Turf).toBe(2);
    expect(apts.surfaceStarts.Dirt).toBe(1);

    // Total starts = 3. 60% of 3 is 1.8. Turf has 2 starts.
    expect(apts.surfaceConfirmed).toBe("Turf");
  });

  it("should confirm distance band after 3 starts with 60% majority", () => {
    let apts: ConfirmedAptitudes = {
      surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
      distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
    };
    apts = updateCampaignAptitudes(apts, "Turf", 1200); // sprint
    apts = updateCampaignAptitudes(apts, "Turf", 1200); // sprint
    apts = updateCampaignAptitudes(apts, "Turf", 2000); // intermediate

    expect(apts.distanceBandStarts.sprint).toBe(2);
    expect(apts.distanceBandStarts.intermediate).toBe(1);

    expect(apts.distanceBandConfirmed).toBe("sprint");
  });

  it("should not confirm if no majority", () => {
    let apts: ConfirmedAptitudes = {
      surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
      distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
    };
    apts = updateCampaignAptitudes(apts, "Turf", 1200); // sprint
    apts = updateCampaignAptitudes(apts, "Dirt", 1600); // mile
    apts = updateCampaignAptitudes(apts, "Synthetic", 2000); // intermediate

    expect(apts.surfaceStarts.Turf).toBe(1);
    expect(apts.surfaceStarts.Dirt).toBe(1);
    expect(apts.surfaceStarts.Synthetic).toBe(1);

    expect(apts.surfaceConfirmed).toBeUndefined();

    expect(apts.distanceBandStarts.sprint).toBe(1);
    expect(apts.distanceBandStarts.mile).toBe(1);
    expect(apts.distanceBandStarts.intermediate).toBe(1);

    expect(apts.distanceBandConfirmed).toBeUndefined();
  });
});
