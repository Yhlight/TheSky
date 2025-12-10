import { test, expect } from '@playwright/test';

test('visually verify game smoothness and style', async ({ page }) => {
  // Navigate to the locally served game from Vite with a fixed seed
  await page.goto('http://localhost:5173/?seed=12345');
  await page.waitForLoadState('networkidle');

  // Press "Enter" to start the game
  await page.keyboard.press('Enter');

  // Wait for the canvas to be ready and rendered
  await page.waitForSelector('#canvas', { timeout: 60000 });

  // Give the game a few seconds to run and stabilize
  await page.waitForTimeout(5000);

  // Take a screenshot for visual verification
  await expect(page).toHaveScreenshot('game-play.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.05, // Allow for small rendering differences
  });
});
