import { test, expect } from "@playwright/test";

test.describe("RaceCard Weather Display", () => {
  test.beforeEach(async ({ page }) => {
    // In a real E2E test, we would navigate to the app and set up the state.
    // For this demonstration, we'll assume the app is running and we can inject state
    // or use a specific test route.
    await page.goto("/");

    // Inject mock state into localStorage/OPFS if needed,
    // or rely on the app's initialization logic.
    // For now, we'll just check if the components render.
  });

  test("verifies RaceCard renders weather forecast and condition", async ({ page }) => {
    // Look for a RaceCard
    const raceCard = page
      .locator(".overflow-hidden")
      .filter({ hasText: /Day \d+/ })
      .first();
    await expect(raceCard).toBeVisible();

    // Verify WeatherForecastStrip is present
    const weatherStrip = raceCard.locator('[aria-label="7-day forecast"]');
    await expect(weatherStrip).toBeVisible();

    // Verify condition badge
    const conditionBadge = raceCard.locator(".badge").first();
    await expect(conditionBadge).toBeVisible();
  });

  test("verifies Weather Alert in Inbox after storm jump", async ({ page }) => {
    // Simulate a storm jump by interacting with the app (e.g., clicking 'Next Day' until a storm happens)
    // Or inject a message directly into the store for testing UI persistence.

    await page.evaluate(() => {
      // Access the store and add a message
      // Note: This requires the store to be accessible on window in dev mode
      if ((window as any).useGame) {
        (window as any).useGame.getState().inbox.push({
          id: "test-storm-alert",
          day: 10,
          category: "system",
          priority: "action",
          title: "Weather Alert",
          body: "Storm forecast at Test Track",
          cta: { label: "View Race", route: "race.1" },
        });
      }
    });

    // Go to inbox
    await page.click("nav >> text=Inbox");

    // Verify the alert is there
    await expect(page.locator("text=Weather Alert")).toBeVisible();
    await expect(page.locator("text=Storm forecast at Test Track")).toBeVisible();

    // Verify unread badge in navigation
    const unreadBadge = page.locator("nav").locator("text=1");
    await expect(unreadBadge).toBeVisible();
  });
});
