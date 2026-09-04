import { test, expect, describe } from "vitest";
import { buildInsightRow, metricExtent } from "@/core/horse/insightMetrics";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

describe("insightMetrics", () => {
  describe("buildInsightRow", () => {
    test("flattens a horse correctly", () => {
      const horse = createTestHorse({
        id: "test-horse-h1",
        careerStarts: 10,
        careerWins: 2,
        stats: {
          speed: 80,
          stamina: 75,
          acceleration: 85,
          temperament: 60,
          consistency: 90,
          conformation: 70,
        },
      });
      const row = buildInsightRow(horse, [], "Test Owner", "stable1");

      expect(row.id).toBe("test-horse-h1");
      expect(row.ownerLabel).toBe("Test Owner");
      expect(row.ownerId).toBe("stable1");
      expect(row.metrics.speed).toBe(80);
      expect(row.metrics.stamina).toBe(75);
      expect(row.metrics.starts).toBe(10);
      expect(row.metrics.wins).toBe(2);
      expect(row.metrics.winRate).toBe(20);
    });

    test("handles horses with zero starts", () => {
      const horse = createTestHorse({
        id: "test-horse-h2",
        careerStarts: 0,
        careerWins: 0,
      });
      const row = buildInsightRow(horse, [], "Test Owner", null);

      expect(row.metrics.starts).toBe(0);
      expect(row.metrics.wins).toBe(0);
      expect(row.metrics.winRate).toBe(0); // Should not be NaN
    });
  });

  describe("metricExtent", () => {
    test("calculates correct extent for normal values", () => {
      const row1 = buildInsightRow(
        createTestHorse({ id: "test-horse-h1", careerStarts: 10 }),
        [],
        "O1",
        null,
      );
      const row2 = buildInsightRow(
        createTestHorse({ id: "test-horse-h2", careerStarts: 20 }),
        [],
        "O1",
        null,
      );
      const row3 = buildInsightRow(
        createTestHorse({ id: "test-horse-h3", careerStarts: 15 }),
        [],
        "O1",
        null,
      );

      const [min, max] = metricExtent([row1, row2, row3], "starts");
      // max - min = 10, pad = 10 * 0.05 = 0.5
      expect(min).toBe(9.5);
      expect(max).toBe(20.5);
    });

    test("widens extent when all values are identical", () => {
      const row1 = buildInsightRow(
        createTestHorse({ id: "test-horse-h1", careerStarts: 10 }),
        [],
        "O1",
        null,
      );
      const row2 = buildInsightRow(
        createTestHorse({ id: "test-horse-h2", careerStarts: 10 }),
        [],
        "O1",
        null,
      );

      const [min, max] = metricExtent([row1, row2], "starts");
      expect(min).toBe(9);
      expect(max).toBe(11);
    });

    test("returns [0, 1] for empty rows", () => {
      const [min, max] = metricExtent([], "starts");
      expect(min).toBe(0);
      expect(max).toBe(1);
    });
  });
});
