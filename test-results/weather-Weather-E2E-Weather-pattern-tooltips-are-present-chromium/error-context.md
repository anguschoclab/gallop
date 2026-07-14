# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: weather.spec.ts >> Weather E2E >> Weather pattern tooltips are present
- Location: src/tests/e2e/weather.spec.ts:194:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Race Schedule')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Race Schedule')

```

```yaml
- paragraph: Loading...
- region "Notifications alt+T"
```

# Test source

```ts
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
  141 |     await expect(page.getByText("Race Schedule")).toBeVisible();
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
  153 |     await expect(page.getByText("Message Center")).toBeVisible();
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
  167 |     await expect(page.getByText("Race Schedule")).toBeVisible();
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
  185 |     await expect(page.getByText("Race Schedule")).toBeVisible();
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
> 197 |     await expect(page.getByText("Race Schedule")).toBeVisible();
      |                                                   ^ Error: expect(locator).toBeVisible() failed
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
  219 |     await expect(page.getByText("Message Center")).toBeVisible();
  220 |     await expect(page.getByText("Weather Alert")).toBeVisible();
  221 | 
  222 |     await page.reload();
  223 | 
  224 |     await expect(page.getByText("Message Center")).toBeVisible();
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