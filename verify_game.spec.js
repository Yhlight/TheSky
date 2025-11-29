const { test, expect } = require('@playwright/test');

test('visually verify game smoothness and style', async ({ page }) => {
  // Navigate to the locally served game
  await page.goto('http://localhost:8888');

  // Wait for the game canvas to be visible and stable
  await page.waitForSelector('#canvas', { state: 'visible' });
  await page.waitForTimeout(2000); // Wait 2 seconds for initial animations

  // Simulate accelerating for 5 seconds to see the visual changes
  await page.keyboard.down('Space');
  await page.waitForTimeout(5000);
  await page.keyboard.up('Space');

  // Wait a moment for the speed to normalize
  await page.waitForTimeout(1000);

  // Create a directory for verification output if it doesn't exist
  const fs = require('fs');
  if (!fs.existsSync('verification')) {
    fs.mkdirSync('verification');
  }

  // Take a screenshot to visually verify the changes
  await page.screenshot({ path: 'verification/screenshot.png' });
});
