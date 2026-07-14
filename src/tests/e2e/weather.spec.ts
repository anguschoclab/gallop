import { test, expect, type Page } from "@playwright/test";

const FORECAST_PATTERNS = [
  "clear",
  "overcast",
  "shower",
  "rain",
  "storm",
  "snow",
  "clear",
] as const;

function buildWeatherState(trackId: string, day: number, pattern: string) {
  return {
    trackId,
    day,
    pattern,
    tempC: 15,
    humidity: 0.6,
    windKph: 20,
  };
}

function seedWeatherState(page: Page, overrides?: {
  withInbox?: boolean;
  withForecast?: boolean;
  withCurrentWeather?: boolean;
}) {
  const opts = {
    withInbox: true,
    withForecast: true,
    withCurrentWeather: true,
    ...overrides,
  };

  const trackId = "test-track";

  const weather: Record<string, unknown> = {};
  if (opts.withCurrentWeather) {
    weather.byTrack = {
      [trackId]: [buildWeatherState(trackId, 5, "storm")],
    };
  }
  if (opts.withForecast) {
    weather.forecast = {
      [trackId]: FORECAST_PATTERNS.map((p, i) =>
        buildWeatherState(trackId, 6 + i, p),
      ),
    };
  }

  const inbox = opts.withInbox
    ? [
        {
          id: "test-storm-alert",
          day: 5,
          category: "system",
          priority: "action",
          title: "Weather Alert",
          body: "Storm forecast at Test Track — track downgraded ahead of the Test G1.",
          cta: {
            label: "View Race",
            route: "race.$raceId",
            params: { raceId: "race-1" },
          },
        },
      ]
    : [];

  const payload = {
    meta: {
      storeVersion: 3,
      day: 5,
      cash: 100000,
      playerProfile: {
        stableName: "Test Stables",
        ownerName: "Test Owner",
        silk: {
          pattern: "solid",
          primary: "#ff0000",
          secondary: "#0000ff",
          cap: "#00ff00",
        },
        backstoryId: "inheritor",
        founded: 1,
      },
      weather,
      inbox,
    },
    horses: { playerHorses: {}, npcSummaries: [] },
    races: {
      "race-1": {
        id: "race-1",
        name: "Test G1",
        day: 5,
        distance: 2000,
        raceClass: "Stakes",
        entryFee: 500,
        purse: 100000,
        fieldSize: 14,
        entries: [],
        resolved: false,
        trackId,
        trackCondition: "heavy",
        graded: {
          key: "test-g1",
          grade: "G1",
          track: "Test Track",
          trackId,
          surface: "Turf",
        },
      },
    },
    npcStables: {},
  };

  return page.addInitScript((data) => {
    // Force localStorage fallback by making IndexedDB unavailable
    try {
      delete (window as any).indexedDB;
    } catch {
      (window as any).indexedDB = undefined;
    }
    localStorage.setItem(
      "gallop_game_state_fallback",
      JSON.stringify(data),
    );
  }, payload);
}

test.describe("Weather E2E", () => {
  test.beforeEach(async ({ page }) => {
    await seedWeatherState(page);
  });

  test("RaceCard renders weather forecast strip and condition badge", async ({
    page,
  }) => {
    await page.goto("/racing?tab=races");

    await expect(page.getByText("Race Schedule")).toBeVisible({ timeout: 15_000 });

    const forecast = page.locator('[aria-label="7-day forecast"]');
    await expect(forecast).toBeVisible();

    const conditionBadge = page.locator(".badge", { hasText: "heavy" });
    await expect(conditionBadge).toBeVisible();
  });

  test("Weather Alert in Inbox after storm", async ({ page }) => {
    await page.goto("/inbox");

    await expect(page.getByText("Message Center")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Weather Alert")).toBeVisible();
    await expect(
      page.getByText("Storm forecast at Test Track"),
    ).toBeVisible();

    const unreadDot = page.locator(".bg-gold.animate-pulse");
    await expect(unreadDot).toBeVisible();
  });

  test("Weather forecast icons render correct patterns", async ({ page }) => {
    await page.goto("/racing?tab=races");

    await expect(page.getByText("Race Schedule")).toBeVisible({ timeout: 15_000 });

    const forecastContainer = page.locator('[aria-label="7-day forecast"]');
    await expect(forecastContainer).toBeVisible();

    const forecastIcons = forecastContainer.locator("[aria-label]");
    await expect(forecastIcons).toHaveCount(7);

    for (const pattern of FORECAST_PATTERNS) {
      await expect(
        forecastContainer.locator(`[aria-label="${pattern}"]`),
      ).toBeVisible();
    }
  });

  test("Track condition badge displays correct text", async ({ page }) => {
    await page.goto("/racing?tab=races");

    await expect(page.getByText("Race Schedule")).toBeVisible({ timeout: 15_000 });

    const badge = page.locator(".badge", { hasText: "heavy" });
    await expect(badge).toBeVisible();

    const tooltipTrigger = badge.locator(".cursor-help");
    await expect(tooltipTrigger).toBeVisible();
  });

  test("Weather pattern tooltips are present", async ({ page }) => {
    await page.goto("/racing?tab=races");

    await expect(page.getByText("Race Schedule")).toBeVisible({ timeout: 15_000 });

    const forecastContainer = page.locator('[aria-label="7-day forecast"]');
    await expect(forecastContainer).toBeVisible();

    const tooltipTriggers = forecastContainer.locator(".cursor-help");
    const count = await tooltipTriggers.count();
    expect(count).toBeGreaterThanOrEqual(1);

    for (const trigger of await tooltipTriggers.all()) {
      const classAttr = await trigger.getAttribute("class");
      expect(classAttr).toContain("decoration-dotted");
    }

    const conditionBadge = page.locator(".badge", { hasText: "heavy" });
    const badgeTooltip = conditionBadge.locator(".cursor-help");
    await expect(badgeTooltip).toBeVisible();
  });

  test("Storm alert persists across page reload", async ({ page }) => {
    await page.goto("/inbox");

    await expect(page.getByText("Message Center")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Weather Alert")).toBeVisible();

    await page.reload();

    await expect(page.getByText("Message Center")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Weather Alert")).toBeVisible();
    await expect(
      page.getByText("Storm forecast at Test Track"),
    ).toBeVisible();

    const inboxLink = page.getByRole("link", { name: /Inbox/ });
    const unreadBadge = inboxLink.locator(".bg-red-600");
    await expect(unreadBadge).toBeVisible();
    await expect(unreadBadge).toHaveText("1");
  });
});
