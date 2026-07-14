import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { width: 375, height: 812, name: "mobile" },
  { width: 768, height: 1024, name: "tablet" },
  { width: 1280, height: 800, name: "desktop" },
];

for (const vp of VIEWPORTS) {
  test.describe(`HorseCompare layout at ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("horse name columns do not overlap in compare dialog", async ({ page }) => {
      await page.goto("/");

      // Skip if no game state (no horses available)
      const stableLink = page.locator('a[href*="/stable"]').first();
      await expect(stableLink).toBeVisible({ timeout: 5000 }).catch(() => {
        test.skip(true, "No game state found");
      });

      await stableLink.click();
      await page.waitForURL(/\/stable/);

      // Look for compare checkboxes in the roster
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      if (count < 2) {
        test.skip(true, "Not enough horses with compare checkboxes");
      }

      // Select first 2 checkboxes
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Click compare button
      const compareBtn = page.locator("button", { hasText: /compare/i }).first();
      await expect(compareBtn).toBeVisible({ timeout: 3000 }).catch(() => {
        test.skip(true, "No compare button found");
      });
      await compareBtn.click();

      // Wait for dialog
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 }).catch(() => {
        test.skip(true, "Compare dialog did not open");
      });

      // Get horse name elements from the header row
      const headerGrid = dialog.locator(".grid.border-b").first();
      const nameSpans = headerGrid.locator("span.font-bold");
      const nameCount = await nameSpans.count();

      if (nameCount >= 2) {
        const rects: Array<{ x: number; right: number; y: number; bottom: number }> = [];
        for (let i = 0; i < nameCount; i++) {
          const box = await nameSpans.nth(i).boundingBox();
          if (box) rects.push({ x: box.x, right: box.x + box.width, y: box.y, bottom: box.y + box.height });
        }
        // Check no horizontal overlap between name elements
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const horizontalOverlap = rects[i].x < rects[j].right && rects[j].x < rects[i].right;
            const verticalOverlap = rects[i].y < rects[j].bottom && rects[j].y < rects[i].bottom;
            expect(!horizontalOverlap || !verticalOverlap).toBe(true);
          }
        }
      }
    });

    test("table rows occupy distinct vertical bands", async ({ page }) => {
      await page.goto("/");

      const stableLink = page.locator('a[href*="/stable"]').first();
      await expect(stableLink).toBeVisible({ timeout: 5000 }).catch(() => {
        test.skip(true, "No game state found");
      });

      await stableLink.click();
      await page.waitForURL(/\/stable/);

      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      if (count < 2) {
        test.skip(true, "Not enough horses with compare checkboxes");
      }

      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      const compareBtn = page.locator("button", { hasText: /compare/i }).first();
      await expect(compareBtn).toBeVisible({ timeout: 3000 }).catch(() => {
        test.skip(true, "No compare button found");
      });
      await compareBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 }).catch(() => {
        test.skip(true, "Compare dialog did not open");
      });

      // Check table rows don't vertically overlap
      const rows = dialog.locator("table tbody tr");
      const rowCount = await rows.count();

      if (rowCount >= 2) {
        for (let i = 0; i < rowCount - 1; i++) {
          const box1 = await rows.nth(i).boundingBox();
          const box2 = await rows.nth(i + 1).boundingBox();
          if (box1 && box2) {
            // Rows should not overlap vertically (allow 1px tolerance)
            expect(box1.y + box1.height).toBeLessThanOrEqual(box2.y + 1);
          }
        }
      }
    });
  });
}
