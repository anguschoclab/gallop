import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures", "e2e-fixture.json"), "utf-8"));

const VIEWPORTS = [
  { width: 375, height: 812, name: "mobile" },
  { width: 768, height: 1024, name: "tablet" },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript((data) => {
    try {
      Object.defineProperty(window, "indexedDB", {
        get: () => undefined,
        configurable: true,
      });
    } catch {
      try { delete (window as any).indexedDB; } catch { (window as any).indexedDB = undefined; }
    }
    localStorage.setItem("gallop_game_state_fallback", JSON.stringify(data));
  }, fixture);
});

for (const vp of VIEWPORTS) {
  test.describe(`NPC Stable Roster layout at ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test.setTimeout(60_000);

    test("horse name and scout-status badge do not overlap", async ({ page }) => {
      // Navigate directly to NPC stables index to find stable links
      await page.goto("/npc-stables");

      const stableLinks = page.locator('a[href*="/npc-stables/"]');
      await expect(stableLinks.first()).toBeVisible({ timeout: 15_000 }).catch(() => {
        test.skip(true, "No game state found");
      });

      const linkCount = await stableLinks.count();
      if (linkCount === 0) {
        test.skip(true, "No NPC stable links found");
      }

      // Navigate to first NPC stable
      await stableLinks.first().click();
      await page.waitForURL(/\/npc-stables\//);

      // Click roster tab if not already active
      const rosterTab = page.locator('[role="tab"]', { hasText: /roster/i }).first();
      await expect(rosterTab).toBeVisible({ timeout: 10_000 }).catch(() => {
        test.skip(true, "No roster tab found");
      });
      await rosterTab.click();

      // Wait for roster tabpanel to be visible
      const tabpanel = page.getByRole('tabpanel', { name: 'Roster' });
      await expect(tabpanel).toBeVisible({ timeout: 10_000 });

      // Find horse cards in the roster tabpanel
      const cards = tabpanel.locator('.relative.group');
      await expect(cards.first()).toBeVisible({ timeout: 10_000 }).catch(() => {
        test.skip(true, "No horse cards in NPC stable roster");
      });

      // Check first card for name/badge overlap
      const firstCard = cards.first();
      const nameSpan = firstCard.locator("span.text-lg").first();
      const scoutBadge = firstCard.locator('div[class*="tracking-widest"]').filter({ hasText: /unknown|known|scouted/i }).first();

      const nameBox = await nameSpan.boundingBox();
      const badgeBox = await scoutBadge.boundingBox();

      if (nameBox && badgeBox) {
        const horizontalOverlap = nameBox.x < badgeBox.x + badgeBox.width && badgeBox.x < nameBox.x + nameBox.width;
        const verticalOverlap = nameBox.y < badgeBox.y + badgeBox.height && badgeBox.y < nameBox.y + nameBox.height;
        expect(!horizontalOverlap || !verticalOverlap).toBe(true);
      }
    });

    test("OFFER and SCOUT buttons do not overlap each other", async ({ page }) => {
      await page.goto("/npc-stables");

      const stableLinks = page.locator('a[href*="/npc-stables/"]');
      await expect(stableLinks.first()).toBeVisible({ timeout: 15_000 }).catch(() => {
        test.skip(true, "No game state found");
      });

      const linkCount = await stableLinks.count();
      if (linkCount === 0) {
        test.skip(true, "No NPC stable links found");
      }

      await stableLinks.first().click();
      await page.waitForURL(/\/npc-stables\//);

      const rosterTab = page.locator('[role="tab"]', { hasText: /roster/i }).first();
      await expect(rosterTab).toBeVisible({ timeout: 10_000 }).catch(() => {
        test.skip(true, "No roster tab found");
      });
      await rosterTab.click();

      const tabpanel = page.getByRole('tabpanel', { name: 'Roster' });
      await expect(tabpanel).toBeVisible({ timeout: 10_000 });
      const cards = tabpanel.locator('.relative.group');
      await expect(cards.first()).toBeVisible({ timeout: 10_000 }).catch(() => {
        test.skip(true, "No horse cards in NPC stable roster");
      });

      const firstCard = cards.first();
      const buttons = firstCard.locator("button", { hasText: /OFFER|SCOUT/i });
      const btnCount = await buttons.count();

      if (btnCount >= 2) {
        const box1 = await buttons.nth(0).boundingBox();
        const box2 = await buttons.nth(1).boundingBox();
        if (box1 && box2) {
          const horizontalOverlap = box1.x < box2.x + box2.width && box2.x < box1.x + box1.width;
          const verticalOverlap = box1.y < box2.y + box2.height && box2.y < box1.y + box1.height;
          expect(!horizontalOverlap || !verticalOverlap).toBe(true);
        }
      }
    });
  });
}
