import { describe, it, expect } from "vitest";
import { getMonthName, formatDate, dayOfYear, gameYearNumber, gameCalendarDate } from "@/core/calendar/dateFormatting";

describe("dayOfYear", () => {
  it("day 1 → 1", () => expect(dayOfYear(1)).toBe(1));
  it("day 365 → 365", () => expect(dayOfYear(365)).toBe(365));
  it("day 366 wraps to 1", () => expect(dayOfYear(366)).toBe(1));
  it("day 730 → 365", () => expect(dayOfYear(730)).toBe(365));
  it("day 367 → 2", () => expect(dayOfYear(367)).toBe(2));
});

describe("gameYearNumber", () => {
  it("day 1 → 2026", () => expect(gameYearNumber(1)).toBe(2026));
  it("day 365 → 2026", () => expect(gameYearNumber(365)).toBe(2026));
  it("day 366 → 2027", () => expect(gameYearNumber(366)).toBe(2027));
  it("day 730 → 2027", () => expect(gameYearNumber(730)).toBe(2027));
  it("day 731 → 2028", () => expect(gameYearNumber(731)).toBe(2028));
});

describe("getMonthName", () => {
  it("day 1 → January", () => expect(getMonthName(1)).toBe("January"));
  it("day 30 → January (last day)", () => expect(getMonthName(30)).toBe("January"));
  it("day 31 → February (first day)", () => expect(getMonthName(31)).toBe("February"));
  it("day 58 → February (last day)", () => expect(getMonthName(58)).toBe("February"));
  it("day 59 → March (first day)", () => expect(getMonthName(59)).toBe("March"));
  it("day 89 → March (last day)", () => expect(getMonthName(89)).toBe("March"));
  it("day 90 → April (first day)", () => expect(getMonthName(90)).toBe("April"));
  it("day 334 → December", () => expect(getMonthName(334)).toBe("December"));
  it("day 365 → December", () => expect(getMonthName(365)).toBe("December"));
});

describe("formatDate", () => {
  it("day 1 → Jan 2 (formula: 1-0+1=2)", () => expect(formatDate(1)).toBe("Jan 2"));
  it("day 30 → Jan 31 (last Jan day)", () => expect(formatDate(30)).toBe("Jan 31"));
  it("day 31 → Feb 1", () => expect(formatDate(31)).toBe("Feb 1"));
  it("day 58 → Feb 28", () => expect(formatDate(58)).toBe("Feb 28"));
  it("day 59 → Mar 1", () => expect(formatDate(59)).toBe("Mar 1"));
  it("day 365 → Dec 31", () => expect(formatDate(365)).toBe("Dec 31"));
});

describe("gameCalendarDate", () => {
  it("day 1 → Jan 2, 2026 (formula offset)", () => expect(gameCalendarDate(1)).toBe("Jan 2, 2026"));
  it("day 365 → Dec 31, 2026", () => expect(gameCalendarDate(365)).toBe("Dec 31, 2026"));
  it("day 366 → Jan 2, 2027", () => expect(gameCalendarDate(366)).toBe("Jan 2, 2027"));
  it("day 396 → Feb 1, 2027 (396=366+30, day-of-year=31)", () => expect(gameCalendarDate(396)).toBe("Feb 1, 2027"));
});
