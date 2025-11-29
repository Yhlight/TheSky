import { test, expect } from '@playwright/test';

test('visually verify game smoothness and style', async ({ page }) => {
  // Navigate to the locally served game from Vite
  await page.goto('http://localhost:5173');

  // Wait for the canvas to be ready and rendered
  await page.waitForSelector('#canvas');

  // Give the game a few seconds to run and stabilize
  await page.waitForTimeout(5000);

  // Take a screenshot for visual verification
  await expect(page).toHaveScreenshot('game-play.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.05, // Allow for small rendering differences
  });
});
