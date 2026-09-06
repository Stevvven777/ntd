import { expect, test } from '@playwright/test';

const prepare = async (page: import('@playwright/test').Page) => {
	await page.addInitScript(() => localStorage.setItem('prism-bastion-tutorial-offer-resolved', '1'));
	await page.goto('/');
};

test('pointer and keyboard selection keep one persistent level indicator', async ({ page }) => {
	await prepare(page);
	const cards = page.getByRole('radiogroup', { name: 'Choose defense sector' }).getByRole('radio');
	await cards.nth(2).click();
	await expect
		.poll(() => cards.nth(2).evaluate((element) => getComputedStyle(element).boxShadow))
		.toContain(' -8px ');
	const selectedStyle = await cards.nth(2).evaluate((element) => ({
		shadow: getComputedStyle(element).boxShadow,
		outline: getComputedStyle(element).outlineStyle,
	}));
	await cards.nth(0).hover();
	await expect(cards.nth(2)).toHaveAttribute('aria-checked', 'true');
	expect(await cards.nth(2).evaluate((element) => getComputedStyle(element).boxShadow)).toBe(selectedStyle.shadow);
	await page.keyboard.press('ArrowLeft');
	await expect(cards.nth(1)).toBeFocused();
	await expect(cards.nth(1)).toHaveAttribute('aria-checked', 'true');
	expect(await cards.nth(1).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
		selectedStyle.outline,
	);
	await cards.nth(0).click();
	await page.keyboard.press('ArrowRight');
	await expect(cards.nth(1)).toBeFocused();
	await expect(cards.nth(1)).toHaveAttribute('aria-checked', 'true');
});

test('home selection stops at either end', async ({ page }) => {
	await prepare(page);
	const cards = page.getByRole('radiogroup', { name: 'Choose defense sector' }).getByRole('radio');
	await cards.first().click();
	await page.keyboard.press('ArrowLeft');
	await expect(cards.first()).toHaveAttribute('aria-checked', 'true');
	for (let index = 1; index < (await cards.count()); index++) {
		await page.keyboard.press('ArrowRight');
	}
	await expect(cards.last()).toHaveAttribute('aria-checked', 'true');
	await page.keyboard.press('ArrowRight');
	await expect(cards.last()).toHaveAttribute('aria-checked', 'true');
	await expect(cards.last()).toBeFocused();
});
