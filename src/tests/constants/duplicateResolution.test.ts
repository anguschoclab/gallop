import { describe, it, expect } from "vitest";
import * as barrel from "@/constants";
import * as raceBroadcast from "@/constants/raceBroadcastConstants";
import * as regional from "@/constants/regionalConstants";
import * as ui from "@/constants/uiConstants";
import * as calendar from "@/constants/calendarConstants";
import * as timeWindow from "@/core/analytics/timeWindow";

describe("duplicate resolution", () => {
  it("WINNER_PURSE_SHARE is not exported from barrel", () => {
    expect((barrel as Record<string, unknown>).WINNER_PURSE_SHARE).toBeUndefined();
  });

  it("WIN_POSITION is not exported from regionalConstants", () => {
    expect((regional as Record<string, unknown>).WIN_POSITION).toBeUndefined();
  });

  it("TOP3_POSITION is not exported from regionalConstants", () => {
    expect((regional as Record<string, unknown>).TOP3_POSITION).toBeUndefined();
  });

  it("FIXED_DT is not exported from raceBroadcastConstants", () => {
    expect((raceBroadcast as Record<string, unknown>).FIXED_DT).toBeUndefined();
  });

  it("MAX_STEPS_PER_FRAME is not exported from raceBroadcastConstants", () => {
    expect((raceBroadcast as Record<string, unknown>).MAX_STEPS_PER_FRAME).toBeUndefined();
  });

  it("TOOLTIP_DELAY_MS is defined in uiConstants", () => {
    expect(ui.TOOLTIP_DELAY_MS).toBe(300);
  });

  it("DAYS_PER_WEEK is defined in calendarConstants", () => {
    expect(calendar.DAYS_PER_WEEK).toBe(7);
  });

  it("DAYS_PER_WEEK is not defined in timeWindow", () => {
    expect((timeWindow as Record<string, unknown>).DAYS_PER_WEEK).toBeUndefined();
  });
});
