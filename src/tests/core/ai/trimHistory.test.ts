import { describe, it, expect } from "vitest";
import { trimHistory } from "@/core/ai/learningModule";

describe("trimHistory", () => {
  it("should return empty array for empty input", () => {
    expect(trimHistory([], 10)).toEqual([]);
  });

  it("should return array unchanged when shorter than max", () => {
    const arr = [1, 2, 3];
    expect(trimHistory(arr, 10)).toBe(arr);
  });

  it("should return array unchanged when equal to max", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(trimHistory(arr, 5)).toBe(arr);
  });

  it("should return last max elements when longer than max", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(trimHistory(arr, 3)).toEqual([6, 7, 8]);
  });

  it("should return empty array when max is 0", () => {
    expect(trimHistory([1, 2, 3], 0)).toEqual([]);
  });

  it("should preserve element types for objects", () => {
    const arr = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const result = trimHistory(arr, 2);
    expect(result).toEqual([{ id: 3 }, { id: 4 }]);
  });
});
