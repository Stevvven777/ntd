import en from '../packages/web-shared/src/i18n/locales/en.json' with { type: 'json' };
import { textPattern } from '../tests/helpers/text';
import { expect, test } from '@playwright/test';
import { DEFAULT_LEVEL_ID, getLevel } from '../packages/game-core/src/game/config';

const prepare = async (page: import('@playwright/test').Page) => {
	await page.addInitScript(() => localStorage.setItem('prism-bastion-tutorial-offer-resolved', '1'));
	await page.goto('/');
};

test('module selection follows repeated moves and pointer changes in the workshop', async ({ page }) => {
	await prepare(page);
	await page.getByRole('radio', { name: textPattern(en['levels.white-prism.name']) }).click();
	await page.getByRole('button', { name: textPattern(en['levelSelect.creativeTitle']) }).click();
	await page.getByRole('button', { name: textPattern(en['levelSelect.startAction']) }).click();
	const canvas = page.getByRole('img', { name: en['canvas.aria'] });
	const bounds = await canvas.boundingBox();
	if (!bounds) {
		throw new Error('Expected a battlefield');
	}
	const pad = getLevel(DEFAULT_LEVEL_ID).towerPads[0]!;
	const scale = Math.min(bounds.width / 1160, bounds.height / 650);
	await canvas.click({
		position: {
			x: (bounds.width - 1160 * scale) / 2 + pad.x * scale,
			y: (bounds.height - 650 * scale) / 2 + pad.y * scale,
		},
	});
	const workshop = page.getByLabel(en['workshop.aria']);
	await workshop.locator('.orchestration-clear').click();
	await workshop.locator('[data-tutorial-module="pulse"]').dblclick();
	await workshop.locator('[data-tutorial-module="frost"]').dblclick();
	const slot = (index: number) => workshop.locator(`.module-slot[data-slot="${index}"]`);
	await slot(0).click();
	for (const [key, destination] of [
		['Alt+ArrowRight', 1],
		['Alt+ArrowRight', 2],
		['Alt+ArrowLeft', 1],
	] as const) {
		await page.keyboard.press(key);
		await expect(slot(destination)).toBeFocused();
		await expect(slot(destination)).toHaveAttribute('aria-pressed', 'true');
		await expect(slot(destination)).toContainText(en['modules.pulse.short']);
		await expect(workshop.locator('.module-card.selected')).toHaveCount(0);
	}
	await slot(0).click();
	await page.keyboard.press('Alt+ArrowRight');
	await expect(slot(1)).toBeFocused();
	await expect(slot(1)).toHaveAttribute('aria-pressed', 'true');
	await expect(slot(1)).toContainText(en['modules.frost.short']);
	expect(await slot(1).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none');
	expect(await slot(1).evaluate((element) => getComputedStyle(element).boxShadow)).toContain('inset');
});
