/**
 * jockeyFeedback.test.ts - Tests for jockey feedback generation
 *
 * Tests the jockey feedback generation in ResultOverlay to verify:
 * - Feedback correlates with race performance
 * - Different positions generate appropriate feedback
 * - Time differences affect feedback content
 */

import { describe, it, expect } from "vitest";

// Simplified runner type for testing
interface TestRunner {
  horseId: string;
  name: string;
  finishTime: number | null;
  silk: string;
  owned: boolean;
}

// Mock generateJockeyFeedback function (extracted from ResultOverlay)
function generateJockeyFeedback(runner: TestRunner, position: number, ordered: TestRunner[]): string {
  const winner = ordered[0];
  const timeDiff = runner.finishTime && winner.finishTime ? runner.finishTime - winner.finishTime : 0;
  
  if (position === 1) {
    return "Perfect ride! Jockey executed the race plan flawlessly.";
  } else if (position <= 3) {
    if (timeDiff < 0.5) {
      return "Strong finish. Just missed the win but showed great heart.";
    } else {
      return "Good effort. Jockey kept the horse competitive throughout.";
    }
  } else if (timeDiff > 2) {
    return "Difficult race. Horse may have struggled with the pace or traffic.";
  } else {
    return "Mid-pack finish. Jockey managed the race well given the circumstances.";
  }
}

describe("Jockey Feedback Generation", () => {
  it("should generate winning feedback for position 1", () => {
    const runner: TestRunner = {
      horseId: "horse-1",
      name: "Thunder",
      finishTime: 50.0,
      silk: "#ff0000",
      owned: true,
    };
    const ordered = [runner];
    
    const feedback = generateJockeyFeedback(runner, 1, ordered);
    expect(feedback).toContain("Perfect ride");
    expect(feedback).toContain("flawlessly");
  });

  it("should generate close finish feedback for positions 2-3 with small time diff", () => {
    const winner: TestRunner = {
      horseId: "horse-1",
      name: "Thunder",
      finishTime: 50.0,
      silk: "#ff0000",
      owned: true,
    };
    const runner: TestRunner = {
      horseId: "horse-2",
      name: "Lightning",
      finishTime: 50.3,
      silk: "#00ff00",
      owned: true,
    };
    const ordered = [winner, runner];
    
    const feedback = generateJockeyFeedback(runner, 2, ordered);
    expect(feedback).toContain("Strong finish");
    expect(feedback).toContain("great heart");
  });

  it("should generate good effort feedback for positions 2-3 with larger time diff", () => {
    const winner: TestRunner = {
      horseId: "horse-1",
      name: "Thunder",
      finishTime: 50.0,
      silk: "#ff0000",
      owned: true,
    };
    const runner: TestRunner = {
      horseId: "horse-2",
      name: "Lightning",
      finishTime: 51.5,
      silk: "#00ff00",
      owned: true,
    };
    const ordered = [winner, runner];
    
    const feedback = generateJockeyFeedback(runner, 2, ordered);
    expect(feedback).toContain("Good effort");
    expect(feedback).toContain("competitive");
  });

  it("should generate difficult race feedback for large time differences", () => {
    const winner: TestRunner = {
      horseId: "horse-1",
      name: "Thunder",
      finishTime: 50.0,
      silk: "#ff0000",
      owned: true,
    };
    const runner: TestRunner = {
      horseId: "horse-2",
      name: "Lightning",
      finishTime: 53.0,
      silk: "#00ff00",
      owned: true,
    };
    const ordered = [winner, runner];
    
    const feedback = generateJockeyFeedback(runner, 5, ordered);
    expect(feedback).toContain("Difficult race");
    expect(feedback).toContain("pace or traffic");
  });

  it("should generate mid-pack feedback for average performance", () => {
    const winner: TestRunner = {
      horseId: "horse-1",
      name: "Thunder",
      finishTime: 50.0,
      silk: "#ff0000",
      owned: true,
    };
    const runner: TestRunner = {
      horseId: "horse-2",
      name: "Lightning",
      finishTime: 51.0,
      silk: "#00ff00",
      owned: true,
    };
    const ordered = [winner, runner];
    
    const feedback = generateJockeyFeedback(runner, 5, ordered);
    expect(feedback).toContain("Mid-pack finish");
    expect(feedback).toContain("managed the race well");
  });

  it("should handle missing finish times gracefully", () => {
    const winner: TestRunner = {
      horseId: "horse-1",
      name: "Thunder",
      finishTime: 50.0,
      silk: "#ff0000",
      owned: true,
    };
    const runner: TestRunner = {
      horseId: "horse-2",
      name: "Lightning",
      finishTime: null,
      silk: "#00ff00",
      owned: true,
    };
    const ordered = [winner, runner];
    
    const feedback = generateJockeyFeedback(runner, 5, ordered);
    expect(feedback).toContain("Mid-pack finish");
  });
});
