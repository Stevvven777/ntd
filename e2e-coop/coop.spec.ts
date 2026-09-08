import { translate } from '../tests/helpers/translate';

import en from '../packages/web-shared/src/i18n/locales/en.json' with { type: 'json' };
import { expect, test } from '@playwright/test';

test('two friends join, draft simultaneously, and start local defense', async ({ browser }) => {
	test.setTimeout(45_000);
	const firstContext = await browser.newContext();
	const secondContext = await browser.newContext();
	const first = await firstContext.newPage();
	const second = await secondContext.newPage();
	await second.addInitScript(() => {
		Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined });
	});
	const pageErrors: string[] = [];
	first.on('pageerror', (error) => pageErrors.push(error.message));
	second.on('pageerror', (error) => pageErrors.push(error.message));

	await Promise.all([
		first.goto('/?mode=coop&server=ws://127.0.0.1:4274'),
		second.goto('/?mode=coop&server=ws://127.0.0.1:4274'),
	]);
	await expect(first.getByRole('button', { name: en['settings.title'] })).toBeVisible();
	await first.getByLabel(en['coop.name']).fill('Alpha');
	await first.getByRole('button', { name: en['coop.createAction'] }).click();
	const roomCode = await first.locator('h1[class*="code"]').textContent();
	expect(roomCode).toMatch(/^[A-Z2-9]{6}$/);

	await second.getByLabel(en['coop.name']).fill('Beta');
	await second.getByLabel(en['coop.code']).fill(roomCode!);
	await second.getByRole('button', { name: en['coop.joinAction'] }).click();
	await expect(first.getByText('Beta')).toBeVisible();
	await expect(first.getByRole('button', { name: en['settings.title'] })).toBeVisible();

	await Promise.all([
		first.getByRole('button', { name: en['coop.readyAction'], exact: true }).click(),
		second.getByRole('button', { name: en['coop.readyAction'], exact: true }).click(),
	]);

	for (let pick = 0; pick < 3; pick += 1) {
		const firstOwnOffer = first.getByRole('heading', { name: `Alpha · ${en['coop.you']}` }).locator('..');
		const secondOwnOffer = second.getByRole('heading', { name: `Beta · ${en['coop.you']}` }).locator('..');
		await expect(firstOwnOffer).toBeVisible();
		await expect(secondOwnOffer).toBeVisible();
		await expect(first.getByRole('button', { name: en['settings.title'] })).toBeVisible();
		if (pick === 0) {
			const progress = first.getByRole('progressbar');
			const progressBounds = await progress.evaluate((element) => {
				const root = element.getBoundingClientRect();
				const label = element.querySelector('span')?.getBoundingClientRect();
				return { rootRight: root.right, labelRight: label?.right ?? Number.POSITIVE_INFINITY };
			});
			expect(progressBounds.labelRight).toBeLessThanOrEqual(progressBounds.rootRight + 1);
			const peerChoiceGap = await first
				.locator('[class*="peerChoices"] details')
				.first()
				.evaluate((element) => {
					const choice = element.getBoundingClientRect();
					const summary = element.querySelector('summary')?.getBoundingClientRect();
					return choice.bottom - (summary?.bottom ?? 0);
				});
			expect(peerChoiceGap).toBeLessThanOrEqual(1);
			await firstOwnOffer.getByRole('button', { name: en['thoughtIndex.viewThought'] }).first().click();
			await expect(first.getByRole('main', { name: en['thoughtIndex.title'] })).toBeVisible();
			await expect(first.getByRole('button', { name: en['settings.title'] })).toBeVisible();
			await first.getByRole('button', { name: en['thoughtIndex.backBattlefield'] }).click();
		}
		await firstOwnOffer.getByRole('button', { name: en['reward.choose'] }).first().click();
		await expect(firstOwnOffer.locator('[class*="selectedCard"]')).toHaveCount(1);
		await expect(firstOwnOffer.locator('[class*="dimmedCard"]')).toHaveCount(3);
		await secondOwnOffer.getByRole('button', { name: en['reward.choose'] }).first().click();
	}

	await expect(first.getByRole('img', { name: en['canvas.aria'] })).toBeVisible();
	await expect(second.getByRole('img', { name: en['canvas.aria'] })).toBeVisible();
	await expect(first.getByRole('group', { name: en['header.speed'] })).toHaveCount(0);
	await expect(first.getByRole('button', { name: en['header.pause'] })).toHaveCount(0);
	await expect(first.getByRole('button', { name: en['settings.title'] })).toBeVisible();
	const coopConsoleButton = first.getByRole('button', { name: en['coop.consoleAction'], exact: true });
	await expect(
		first
			.getByText(en['battlefield.nextWave'])
			.locator('..')
			.getByRole('button', { name: en['coop.consoleAction'] }),
	).toBeVisible();
	await expect(coopConsoleButton).toBeVisible();
	await coopConsoleButton.click();
	await expect(first.getByRole('dialog', { name: en['coop.consoleTitle'] })).toContainText('Beta');
	await first.getByRole('button', { name: translate('coop.transferAction', { name: 'Beta' }) }).click();
	await expect(first.getByText(translate('coop.shardsSent', { amount: 20, name: 'Beta' }))).toBeVisible();
	await expect(second.getByText(translate('coop.shardsReceived', { amount: 20, name: 'Alpha' }))).toBeVisible();
	await first.getByRole('button', { name: en['coop.closeConsole'] }).click();

	await first.locator('.launch-button').click();
	const cancelReady = first.getByRole('button', { name: en['coop.cancelReady'] });
	await expect(cancelReady).toBeVisible();
	await coopConsoleButton.click();
	await expect(
		first
			.getByRole('dialog', { name: en['coop.consoleTitle'] })
			.getByRole('button', { name: en['coop.cancelReady'] }),
	).toHaveCount(0);
	await first.getByRole('button', { name: en['coop.closeConsole'] }).click();
	await cancelReady.click();
	await expect(first.locator('.launch-button')).toContainText(en['header.launch']);

	await Promise.all([first.locator('.launch-button').click(), second.locator('.launch-button').click()]);
	await coopConsoleButton.click();
	await expect(first.getByRole('dialog', { name: en['coop.consoleTitle'] })).toContainText(
		en['coop.phase.local-defense'],
	);
	const viewPeerDefense = first.getByRole('button', { name: translate('coop.viewPeerDefense', { name: 'Beta' }) });
	await expect(viewPeerDefense).toBeEnabled();
	await viewPeerDefense.click();
	await expect(first.locator('[data-viewed-player="p2"]')).toBeVisible();
	await expect(first.getByRole('group', { name: en['thoughtIndex.installedModules'] })).toHaveCount(1);
	await expect(first.locator('[data-coop-tower-loadout] [data-module-id]')).toHaveCount(2);
	await first.getByRole('button', { name: en['coop.viewOwnDefense'] }).click();
	await expect(first.locator('[data-viewed-player="p1"]')).toBeVisible();
	await expect(first.getByRole('group', { name: en['thoughtIndex.installedModules'] })).toHaveCount(0);
	expect(pageErrors).toEqual([]);

	await firstContext.close();
	await secondContext.close();
});

test('the entry screen can return to the single-player build', async ({ page }) => {
	await page.goto('/coop.html?server=ws://127.0.0.1:4274');
	await expect(page).toHaveURL(/mode=coop/);
	await page.getByRole('button', { name: en['coop.singlePlayer'] }).click();
	await expect(page).toHaveURL(/\?server=ws%3A%2F%2F127\.0\.0\.1%3A4274$/);
	await expect(page.getByRole('heading', { name: en['tutorialOffer.title'] })).toBeVisible();
});

test('the full site defaults to single player and idle preload opens no socket', async ({ page }) => {
	const sockets: string[] = [];
	page.on('websocket', (socket) => sockets.push(socket.url()));
	await page.addInitScript(() => localStorage.setItem('prism-bastion-tutorial-offer-resolved', '1'));
	await page.goto('/?server=ws://127.0.0.1:4274');
	await expect(page.getByRole('button', { name: en['coop.entryAction'] })).toBeVisible();
	await page.waitForTimeout(1_700);
	expect(sockets).toEqual([]);
	await page.getByRole('button', { name: en['coop.entryAction'] }).click();
	await expect(page).toHaveURL(/mode=coop/);
	await expect(page.getByRole('heading', { name: en['coop.title'] })).toBeVisible();
	expect(sockets).toEqual([]);
});

test('leaving a room returns the leaver to single player and the peer to the co-op entry', async ({ browser }) => {
	const firstContext = await browser.newContext();
	const secondContext = await browser.newContext();
	const first = await firstContext.newPage();
	const second = await secondContext.newPage();

	await Promise.all([
		first.goto('/?mode=coop&server=ws://127.0.0.1:4274'),
		second.goto('/?mode=coop&server=ws://127.0.0.1:4274'),
	]);
	await first.getByLabel(en['coop.name']).fill('Alpha');
	await first.getByRole('button', { name: en['coop.createAction'] }).click();
	const roomCode = await first.locator('h1[class*="code"]').textContent();
	await second.getByLabel(en['coop.name']).fill('Beta');
	await second.getByLabel(en['coop.code']).fill(roomCode!);
	await second.getByRole('button', { name: en['coop.joinAction'] }).click();
	await expect(first.getByText('Beta')).toBeVisible();

	await second.getByRole('button', { name: en['coop.leave'] }).click();
	await expect(second).not.toHaveURL(/mode=coop/);
	await expect(second.getByRole('button', { name: en['coop.entryAction'] })).toBeVisible();
	await expect(first.getByRole('heading', { name: en['coop.title'] })).toBeVisible();
	await expect(first.getByRole('alert')).toContainText(en['coop.ended.closed']);

	await firstContext.close();
	await secondContext.close();
});
