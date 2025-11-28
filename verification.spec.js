import { test, expect } from '@playwright/test';

test('visual verification of game movement', async ({ page }) => {
  await page.goto('http://localhost:8000');
  await page.press('body', 'd');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'movement_verification.png' });
});
