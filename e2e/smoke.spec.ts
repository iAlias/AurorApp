import { test, expect } from '@playwright/test';

test('la home carica', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/AurorApp/)).toBeVisible();
});
