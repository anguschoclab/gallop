# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: weather.spec.ts >> Weather E2E >> RaceCard renders weather forecast strip and condition badge
- Location: src/tests/e2e/weather.spec.ts:136:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Race Schedule')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('Race Schedule')

```

```yaml
- paragraph: Loading...
- region "Notifications alt+T"
```

# Test source

```ts
  41  |       [trackId]: [buildWeatherState(trackId, 5, "storm")],
  42  |     };
  43  |   }
  44  |   if (opts.withForecast) {
  45  |     weather.forecast = {
  46  |       [trackId]: FORECAST_PATTERNS.map((p, i) =>
  47  |         buildWeatherState(trackId, 6 + i, p),
  48  |       ),
  49  |     };
  50  |   }
  51  | 
  52  |   const inbox = opts.withInbox
  53  |     ? [
  54  |         {
  55  |           id: "test-storm-alert",
  56  |           day: 5,
  57  |           category: "system",
  58  |           priority: "action",
  59  |           title: "Weather Alert",
  60  |           body: "Storm forecast at Test Track — track downgraded ahead of the Test G1.",
  61  |           cta: {
  62  |             label: "View Race",
  63  |             route: "race.$raceId",
  64  |             params: { raceId: "race-1" },
  65  |           },
  66  |         },
  67  |       ]
  68  |     : [];
  69  | 
  70  |   const payload = {
  71  |     meta: {
  72  |       storeVersion: 3,
  73  |       day: 5,
  74  |       cash: 100000,
  75  |       playerProfile: {
  76  |         stableName: "Test Stables",
  77  |         ownerName: "Test Owner",
  78  |         silk: {
  79  |           pattern: "solid",
  80  |           primary: "#ff0000",
  81  |           secondary: "#0000ff",
  82  |           cap: "#00ff00",
  83  |         },
  84  |         backstoryId: "inheritor",
  85  |         founded: 1,
  86  |       },
  87  |       weather,
  88  |       inbox,
  89  |     },
  90  |     horses: { playerHorses: {}, npcSummaries: [] },
  91  |     races: {
  92  |       "race-1": {
  93  |         id: "race-1",
  94  |         name: "Test G1",
  95  |         day: 5,
  96  |         distance: 2000,
  97  |         raceClass: "Stakes",
  98  |         entryFee: 500,
  99  |         purse: 100000,
  100 |         fieldSize: 14,
  101 |         entries: [],
  102 |         resolved: false,
  103 |         trackId,
  104 |         trackCondition: "heavy",
  105 |         graded: {
  106 |           key: "test-g1",
  107 |           grade: "G1",
  108 |           track: "Test Track",
  109 |           trackId,
  110 |           surface: "Turf",
  111 |         },
  112 |       },
  113 |     },
  114 |     npcStables: {},
  115 |   };
  116 | 
  117 |   return page.addInitScript((data) => {
  118 |     // Force localStorage fallback by making IndexedDB unavailable
  119 |     try {
  120 |       delete (window as any).indexedDB;
  121 |     } catch {
  122 |       (window as any).indexedDB = undefined;
  123 |     }
  124 |     localStorage.setItem(
  125 |       "gallop_game_state_fallback",
  126 |       JSON.stringify(data),
  127 |     );
  128 |   }, payload);
  129 | }
  130 | 
  131 | test.describe("Weather E2E", () => {
  132 |   test.beforeEach(async ({ page }) => {
  133 |     await seedWeatherState(page);
  134 |   });
  135 | 
  136 |   test("RaceCard renders weather forecast strip and condition badge", async ({
  137 |     page,
  138 |   }) => {
  139 |     await page.goto("/racing?tab=races");
  140 | 
> 141 |     await expect(page.getByText("Race Schedule")).toBeVisible({ timeout: 15_000 });
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  142 | 
  143 |     const forecast = page.locator('[aria-label="7-day forecast"]');
  144 |     await expect(forecast).toBeVisible();
  145 | 
  146 |     const conditionBadge = page.locator(".badge", { hasText: "heavy" });
  147 |     await expect(conditionBadge).toBeVisible();
  148 |   });
  149 | 
  150 |   test("Weather Alert in Inbox after storm", async ({ page }) => {
  151 |     await page.goto("/inbox");
  152 | 
  153 |     await expect(page.getByText("Message Center")).toBeVisible({ timeout: 15_000 });
  154 | 
  155 |     await expect(page.getByText("Weather Alert")).toBeVisible();
  156 |     await expect(
  157 |       page.getByText("Storm forecast at Test Track"),
  158 |     ).toBeVisible();
  159 | 
  160 |     const unreadDot = page.locator(".bg-gold.animate-pulse");
  161 |     await expect(unreadDot).toBeVisible();
  162 |   });
  163 | 
  164 |   test("Weather forecast icons render correct patterns", async ({ page }) => {
  165 |     await page.goto("/racing?tab=races");
  166 | 
  167 |     await expect(page.getByText("Race Schedule")).toBeVisible({ timeout: 15_000 });
  168 | 
  169 |     const forecastContainer = page.locator('[aria-label="7-day forecast"]');
  170 |     await expect(forecastContainer).toBeVisible();
  171 | 
  172 |     const forecastIcons = forecastContainer.locator("[aria-label]");
  173 |     await expect(forecastIcons).toHaveCount(7);
  174 | 
  175 |     for (const pattern of FORECAST_PATTERNS) {
  176 |       await expect(
  177 |         forecastContainer.locator(`[aria-label="${pattern}"]`),
  178 |       ).toBeVisible();
  179 |     }
  180 |   });
  181 | 
  182 |   test("Track condition badge displays correct text", async ({ page }) => {
  183 |     await page.goto("/racing?tab=races");
  184 | 
  185 |     await expect(page.getByText("Race Schedule")).toBeVisible({ timeout: 15_000 });
  186 | 
  187 |     const badge = page.locator(".badge", { hasText: "heavy" });
  188 |     await expect(badge).toBeVisible();
  189 | 
  190 |     const tooltipTrigger = badge.locator(".cursor-help");
  191 |     await expect(tooltipTrigger).toBeVisible();
  192 |   });
  193 | 
  194 |   test("Weather pattern tooltips are present", async ({ page }) => {
  195 |     await page.goto("/racing?tab=races");
  196 | 
  197 |     await expect(page.getByText("Race Schedule")).toBeVisible({ timeout: 15_000 });
  198 | 
  199 |     const forecastContainer = page.locator('[aria-label="7-day forecast"]');
  200 |     await expect(forecastContainer).toBeVisible();
  201 | 
  202 |     const tooltipTriggers = forecastContainer.locator(".cursor-help");
  203 |     const count = await tooltipTriggers.count();
  204 |     expect(count).toBeGreaterThanOrEqual(1);
  205 | 
  206 |     for (const trigger of await tooltipTriggers.all()) {
  207 |       const classAttr = await trigger.getAttribute("class");
  208 |       expect(classAttr).toContain("decoration-dotted");
  209 |     }
  210 | 
  211 |     const conditionBadge = page.locator(".badge", { hasText: "heavy" });
  212 |     const badgeTooltip = conditionBadge.locator(".cursor-help");
  213 |     await expect(badgeTooltip).toBeVisible();
  214 |   });
  215 | 
  216 |   test("Storm alert persists across page reload", async ({ page }) => {
  217 |     await page.goto("/inbox");
  218 | 
  219 |     await expect(page.getByText("Message Center")).toBeVisible({ timeout: 15_000 });
  220 |     await expect(page.getByText("Weather Alert")).toBeVisible();
  221 | 
  222 |     await page.reload();
  223 | 
  224 |     await expect(page.getByText("Message Center")).toBeVisible({ timeout: 15_000 });
  225 |     await expect(page.getByText("Weather Alert")).toBeVisible();
  226 |     await expect(
  227 |       page.getByText("Storm forecast at Test Track"),
  228 |     ).toBeVisible();
  229 | 
  230 |     const inboxLink = page.getByRole("link", { name: /Inbox/ });
  231 |     const unreadBadge = inboxLink.locator(".bg-red-600");
  232 |     await expect(unreadBadge).toBeVisible();
  233 |     await expect(unreadBadge).toHaveText("1");
  234 |   });
  235 | });
  236 | 
```