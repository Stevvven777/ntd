import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 1133, height: 744 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`settings retain their frame across categories at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem('prism-bastion-tutorial-offer-resolved', '1'));
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    const bounds = await dialog.boundingBox();
    await page.getByRole('tab', { name: 'Info', exact: true }).click();
    await expect(dialog.getByRole('link', { name: 'Open source on GitHub' })).toBeVisible();
    expect(await dialog.boundingBox()).toEqual(bounds);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}
