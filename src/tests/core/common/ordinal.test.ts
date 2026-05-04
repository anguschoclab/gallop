import { describe, it, expect } from "vitest";
import { getOrdinalSuffix } from "./ordinal";

describe("getOrdinalSuffix", () => {
  it("0 → th", () => expect(getOrdinalSuffix(0)).toBe("th"));
  it("1 → st", () => expect(getOrdinalSuffix(1)).toBe("st"));
  it("2 → nd", () => expect(getOrdinalSuffix(2)).toBe("nd"));
  it("3 → rd", () => expect(getOrdinalSuffix(3)).toBe("rd"));
  it("4 → th", () => expect(getOrdinalSuffix(4)).toBe("th"));
  it("10 → th", () => expect(getOrdinalSuffix(10)).toBe("th"));
  it("11 → th (teen exception)", () => expect(getOrdinalSuffix(11)).toBe("th"));
  it("12 → th (teen exception)", () => expect(getOrdinalSuffix(12)).toBe("th"));
  it("13 → th (teen exception)", () => expect(getOrdinalSuffix(13)).toBe("th"));
  it("14 → th", () => expect(getOrdinalSuffix(14)).toBe("th"));
  it("21 → st", () => expect(getOrdinalSuffix(21)).toBe("st"));
  it("22 → nd", () => expect(getOrdinalSuffix(22)).toBe("nd"));
  it("23 → rd", () => expect(getOrdinalSuffix(23)).toBe("rd"));
  it("100 → th", () => expect(getOrdinalSuffix(100)).toBe("th"));
  it("101 → st", () => expect(getOrdinalSuffix(101)).toBe("st"));
  it("111 → th (teen exception via 100+11)", () => expect(getOrdinalSuffix(111)).toBe("th"));
  it("112 → th", () => expect(getOrdinalSuffix(112)).toBe("th"));
  it("121 → st", () => expect(getOrdinalSuffix(121)).toBe("st"));
});
