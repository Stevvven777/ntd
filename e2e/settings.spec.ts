import en from '../packages/web-shared/src/i18n/locales/en.json' with { type: 'json' };
import { expect, test } from '@playwright/test';

for (const viewport of [
	{ width: 1440, height: 900 },
	{ width: 1133, height: 744 },
	{ width: 390, height: 844 },
	{ width: 320, height: 568 },
	{ width: 844, height: 390 },
]) {
	test(`settings retain their frame across categories at ${viewport.width}x${viewport.height}`, async ({ page }) => {
		await page.setViewportSize(viewport);
		await page.addInitScript(() => localStorage.setItem('prism-bastion-tutorial-offer-resolved', '1'));
		await page.goto('/');
		await page.getByRole('button', { name: en['settings.title'], exact: true }).click();
		const dialog = page.getByRole('dialog', { name: en['settings.title'] });
		const bounds = await dialog.boundingBox();
		await page.getByRole('tab', { name: en['settings.categories.info'], exact: true }).click();
		await expect(dialog.getByRole('link', { name: en['levelSelect.projectOpenSource'] })).toBeVisible();
		expect(await dialog.boundingBox()).toEqual(bounds);
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
	});
}
