import en from '../packages/web-shared/src/i18n/locales/en.json' with { type: 'json' };
import { textPattern } from '../tests/helpers/text';
import { expect, test, type Page } from '@playwright/test';

async function expectViewportFrame(page: Page, selector: string): Promise<void> {
	const frame = page.locator(selector);
	await expect(frame).toBeVisible();
	const bounds = await frame.boundingBox();
	const viewport = page.viewportSize()!;
	expect(bounds!.x).toBeGreaterThanOrEqual(-1);
	expect(bounds!.y).toBeGreaterThanOrEqual(-1);
	expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
	expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
	await page.mouse.wheel(0, 800);
	expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual({ x: 0, y: 0 });
}

for (const viewport of [
	{ width: 1440, height: 900 },
	{ width: 1133, height: 744 },
	{ width: 390, height: 844 },
	{ width: 320, height: 568 },
	{ width: 844, height: 390 },
]) {
	test(`pages keep stable viewport frames at ${viewport.width}x${viewport.height}`, async ({ page }) => {
		await page.setViewportSize(viewport);
		await page.addInitScript(() => localStorage.setItem('prism-bastion-tutorial-offer-resolved', '1'));
		await page.goto('/');
		await expectViewportFrame(page, '[data-level-select-frame]');
		const modeOptionHeights = await page
			.getByRole('group', { name: en['levelSelect.modeLabel'] })
			.getByRole('button')
			.evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
		expect(Math.max(...modeOptionHeights)).toBeLessThanOrEqual(84);
		await expect(page.locator('.home-meta')).toHaveCount(0);
		if (viewport.height > 600) {
			const artwork = page.getByRole('button', { name: en['levelSelect.remixComposition'] });
			await expect(artwork).toBeVisible();
			const colors = artwork.locator('.home-composition-grid--color');
			await expect(colors).toHaveCSS('opacity', '0');
			await artwork.hover();
			await expect(colors).toHaveCSS('opacity', '1');
			await page.screenshot({ path: `/tmp/ntd-art-color-${viewport.width}.png` });
			await page.mouse.move(0, 0);
			await expect(colors).toHaveCSS('opacity', '0');
			const note = artwork.locator('.home-composition-notes > rect').first();
			const before = await note.getAttribute('fill');
			await artwork.focus();
			await page.keyboard.press('Enter');
			expect(await note.getAttribute('fill')).not.toEqual(before);
		}
		await page.getByRole('button', { name: en['settings.title'], exact: true }).click();
		await page.keyboard.press('Escape');
		const initial = await page.locator('[data-level-select-frame]').boundingBox();
		const setup = await page.locator('[data-mission-controls]').boundingBox();
		await page
			.getByRole('group', { name: en['levelSelect.modeLabel'] })
			.getByRole('button', { name: textPattern(en['levelSelect.creativeTitle']) })
			.click();
		expect(await page.locator('[data-level-select-frame]').boundingBox()).toEqual(initial);
		expect(await page.locator('[data-mission-controls]').boundingBox()).toEqual(setup);
		await expect(page.getByRole('spinbutton', { name: en['levelSelect.coreStability'] })).toBeVisible();
		const calibration = await page.locator('[data-creative-setup]').boundingBox();
		const rules = await page.locator('[data-setup-rules]').boundingBox();
		const scales = await page.locator('[data-setup-scales]').boundingBox();
		expect(Math.abs(rules!.y + rules!.height / 2 - (calibration!.y + calibration!.height / 2))).toBeLessThanOrEqual(
			4,
		);
		expect(
			Math.abs(scales!.y + scales!.height / 2 - (calibration!.y + calibration!.height / 2)),
		).toBeLessThanOrEqual(4);
		await expect(page.getByRole('slider', { name: en['levelSelect.speedScale'] })).toBeInViewport();
		expect(await page.locator('[data-mission-controls]').boundingBox()).toEqual(setup);
		await expect(page.getByRole('spinbutton', { name: en['levelSelect.waveCount'] })).toBeInViewport();
		const scrollable = await page.locator('[data-level-select-frame] *').evaluateAll((elements) =>
			elements
				.filter((element) => {
					const style = getComputedStyle(element);
					return (
						(/auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1) ||
						(/auto|scroll/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1)
					);
				})
				.map((element) => element.className),
		);
		expect(scrollable).toEqual([]);
		await page.screenshot({ path: `/tmp/ntd-home-${viewport.width}.png` });
		await page.locator('[data-signal-archive-entry]').click();
		await expectViewportFrame(page, '.signal-archive-console');
		await expect(page.locator('.archive-back')).toBeInViewport();
		await page.locator('.archive-back').click();
		await page.getByRole('button', { name: en['defenseArchive.entryAria'] }).click();
		await expectViewportFrame(page, '[data-defense-archive-frame]');
		await page.locator('.archive-back').click();
		await page.locator('[data-thought-index-entry]').click();
		await expectViewportFrame(page, '.thought-index-frame');
		await expect(page.locator('.thought-controls')).toBeInViewport();
		await page.screenshot({ path: `/tmp/ntd-thought-${viewport.width}.png` });
	});
}
