import { describe, expect, it } from "vitest";
import { formatCurrency, formatTime } from "./formatting";

describe("layer-agnostic formatting facade", () => {
  it("re-exports stable formatting behavior beside the adapter", () => {
    expect(formatCurrency(1234.49)).toBe("$1,234");
    expect(formatTime(75.25)).toBe("75.25s");
  });
});
