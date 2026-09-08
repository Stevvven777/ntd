import { translate } from '../tests/helpers/translate';

import en from '../packages/web-shared/src/i18n/locales/en.json' with { type: 'json' };
import zhCN from '../packages/web-shared/src/i18n/locales/zh-CN.json' with { type: 'json' };
import { textPattern } from '../tests/helpers/text';
import { expect, test, type Page } from '@playwright/test';
import {
	DEFAULT_LEVEL_ID,
	getLevel,
	resolveSpawnEntrances,
	TUTORIAL_LEVEL_ID,
	type LevelDefinition,
} from '../packages/game-core/src/game/config';
import type { SignalId, Point } from '../packages/game-core/src/game/types';
import { getSignalCapability, SIGNAL_IDS, signalRegistry } from '../packages/game-core/src/signals';

const WORLD = { width: 1160, height: 650 } as const;
const TUTORIAL_OFFER_STORAGE_KEY = 'prism-bastion-tutorial-offer-resolved';
const defaultLevel = getLevel(DEFAULT_LEVEL_ID);
const tutorialLevel = getLevel(TUTORIAL_LEVEL_ID);
const triuneLevel = getLevel('triune-delta');
const signalTypes = SIGNAL_IDS;

const formatValue = (value: number): string =>
	Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

function towerPad(level: LevelDefinition, index: number): Point {
	const pad = level.towerPads[index];
	if (!pad) {
		throw new Error(`Expected tower pad ${index} in ${level.id}`);
	}
	return pad;
}

function configuredSignalCounts(level: LevelDefinition, waveIndex: number): Map<SignalId, number> {
	const counts = new Map<SignalId, number>();
	for (const entry of level.waves[waveIndex] ?? []) {
		const count = resolveSpawnEntrances(entry, level.graph).length;
		counts.set(entry.type, (counts.get(entry.type) ?? 0) + count);
	}
	return counts;
}

function archiveNumber(type: SignalId): string {
	return String(signalTypes.indexOf(type) + 1).padStart(2, '0');
}

async function prepareReturningPlayer(page: Page): Promise<void> {
	await page.addInitScript((key) => localStorage.setItem(key, '1'), TUTORIAL_OFFER_STORAGE_KEY);
}

async function clickBattlefieldAt(page: Page, point: Point): Promise<void> {
	const canvas = page.getByRole('img', { name: en['canvas.aria'] });
	const bounds = await canvas.boundingBox();
	if (!bounds) {
		throw new Error('Expected the battlefield canvas to have bounds');
	}
	const scale = Math.min(bounds.width / WORLD.width, bounds.height / WORLD.height);
	const offsetX = (bounds.width - WORLD.width * scale) / 2;
	const offsetY = (bounds.height - WORLD.height * scale) / 2;
	await page.mouse.click(bounds.x + offsetX + point.x * scale, bounds.y + offsetY + point.y * scale);
}

test('first visit offers the tutorial and remembers a final choice', async ({ page }) => {
	await page.goto('/');
	const offer = page.locator('.tutorial-offer');
	await expect(offer).toBeVisible();
	await expect(offer).toHaveAccessibleName(en['tutorialOffer.title']);
	await offer.getByRole('button', { name: en['settings.title'] }).click();
	await page.getByRole('button', { name: zhCN['lang.name'] }).click();
	await expect(offer.getByRole('heading', { name: zhCN['tutorialOffer.title'] })).toBeVisible();
	await page.getByRole('button', { name: en['lang.name'] }).click();
	await page.getByRole('button', { name: en['settings.close'] }).click();

	await offer.getByRole('button', { name: textPattern(en['tutorialOffer.accept']) }).click();
	await expect(
		page.getByRole('heading', {
			name: `${en['levels.starter-elbow.name']} ${tutorialLevel.sector.replace('SECTOR ', '')}`,
			level: 1,
		}),
	).toBeVisible();
	const tutorial = page.getByRole('region', { name: en['tutorial.aria'] });
	await expect(tutorial.getByRole('heading', { name: en['tutorial.steps.welcome.title'] })).toBeVisible();
	await tutorial.getByRole('button', { name: en['tutorial.skip'] }).click();
	await page.getByRole('button', { name: en['header.exit'] }).click();
	await page.reload();
	await expect(offer).toHaveCount(0);

	await page.evaluate((key) => localStorage.removeItem(key), TUTORIAL_OFFER_STORAGE_KEY);
	await page.reload();
	await expect(offer).toBeVisible();
	await offer.getByRole('button', { name: en['tutorialOffer.decline'] }).click();
	await page.reload();
	await expect(offer).toHaveCount(0);
});

test('setup and battlefield work in a real browser', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (error) => pageErrors.push(error.message));
	await prepareReturningPlayer(page);
	await page.goto('/');

	const standardDifficulty = page.getByRole('radio', { name: textPattern(en['difficulties.normal.name']) });
	await standardDifficulty.focus();
	await page.keyboard.press('ArrowDown');
	await expect(
		page.getByRole('radio', { name: textPattern(en['difficulties.hard.name'], { start: true }) }),
	).toHaveAttribute('aria-checked', 'true');

	await page.getByRole('button', { name: textPattern(en['levelSelect.startAction']) }).click();
	const canvas = page.getByRole('img', { name: en['canvas.aria'] });
	await expect(canvas).toBeVisible();
	const battlefield = page.locator('section').filter({ has: canvas });
	await expect(battlefield).toHaveCSS('border-top-width', '0px');
	await expect(battlefield).toHaveCSS('border-radius', '0px');
	const size = await canvas.boundingBox();
	expect(size?.width ?? 0).toBeGreaterThan(500);
	expect(size?.height ?? 0).toBeGreaterThan(300);
	await expect(page.getByRole('alert')).toHaveCount(0);

	const draft = page.getByRole('region', { name: en['reward.initialAria'] });
	const skip = draft.getByRole('button', {
		name: translate('reward.skip', { count: defaultLevel.moduleDraft.skipLimit }),
	});
	await expect(skip).toHaveText(translate('reward.skip', { count: defaultLevel.moduleDraft.skipLimit }));
	await skip.click();
	await expect(draft.getByText(en['reward.boosted'])).toBeVisible();
	await expect(
		draft.getByRole('button', {
			name: translate('reward.skip', { count: defaultLevel.moduleDraft.skipLimit - 1 }),
		}),
	).toBeDisabled();
	for (let round = 1; round < defaultLevel.moduleDraft.initialPicks; round += 1) {
		await draft.locator('.reward-choose').first().click();
	}
	await expect(draft).toHaveCount(0);
	await clickBattlefieldAt(page, towerPad(defaultLevel, 1));
	await expect(page.getByLabel(en['workshop.aria']).locator('.tower-id')).toHaveText(
		translate('tower.nodeNumber', { id: '02' }),
	);
	expect(pageErrors).toEqual([]);
});

test('thought index plays real scenes and returns to deployment', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (error) => pageErrors.push(error.message));
	await prepareReturningPlayer(page);
	await page.goto('/');

	const entry = page.getByRole('button', { name: en['thoughtIndex.entryAria'] });
	await entry.click();
	const index = page.getByRole('main', { name: en['thoughtIndex.title'] });
	await expect(index).toBeVisible();
	await expect(index.getByRole('img', { name: en['thoughtIndex.canvasAria'] })).toBeVisible();
	await expect(index.locator('.thought-module-badge')).toBeVisible();
	await expect(index.getByRole('button', { name: en['thoughtIndex.previous'] })).toHaveCSS('opacity', '1');
	await index.getByRole('button', { name: en['thoughtIndex.play'] }).click();
	await expect(index.getByRole('button', { name: en['thoughtIndex.pause'] })).toBeVisible();
	await index.locator('button[data-thought-id="frost"]').click();
	await expect(index.locator('.thought-stage')).toHaveAttribute('data-thought-id', 'frost');
	await index.locator('.thought-progress > button').nth(7).click();
	await index.getByRole('button', { name: en['thoughtIndex.play'] }).click();
	await index.locator('[data-thought-scene-overlay][data-cue="replace-area-carrier"]').waitFor();
	await expect(index.locator('[data-thought-loadout-module][data-transition="incoming"]')).toHaveCSS(
		'display',
		'grid',
	);
	await index.locator('.thought-progress > button').nth(10).click();
	await index.locator('[data-thought-scene-overlay][data-cue="show-static-payload"]').waitFor();
	const revealedModules = index.locator('[data-thought-loadout-dialog] [data-thought-loadout-reveal]');
	await expect(revealedModules).toHaveCount(4);
	await revealedModules.last().evaluate(async (element) => {
		await Promise.all(element.getAnimations().map((animation) => animation.finished));
	});
	const moduleGaps = await revealedModules.evaluateAll((elements) =>
		elements.slice(1).map((element, index) => {
			const previous = elements[index]!.getBoundingClientRect();
			return element.getBoundingClientRect().left - previous.right;
		}),
	);
	expect(Math.max(...moduleGaps) - Math.min(...moduleGaps)).toBeLessThan(0.5);
	const highlightedModule = revealedModules.nth(2).locator('[data-thought-loadout-module]');
	const restingHighlightGeometry = await revealedModules.evaluateAll((elements) => ({
		gaps: elements.slice(1).map((element, index) => {
			const previous = elements[index]!.getBoundingClientRect();
			return element.getBoundingClientRect().left - previous.right;
		}),
		widths: elements.map((element) => element.getBoundingClientRect().width),
	}));
	const restingHighlightStyle = await highlightedModule.evaluate((element) => {
		const icon = element.querySelector('span');
		const style = getComputedStyle(element);
		const iconStyle = icon ? getComputedStyle(icon) : null;
		return {
			backgroundColor: style.backgroundColor,
			borderColor: style.borderColor,
			iconBackgroundColor: iconStyle?.backgroundColor,
			iconColor: iconStyle?.color,
		};
	});
	await index.locator('.thought-progress > button').nth(11).click();
	await index.locator('[data-thought-scene-overlay][data-cue="point-static-modifier"]').waitFor();
	await highlightedModule.evaluate(async (element) => {
		await Promise.all(element.getAnimations().map((animation) => animation.finished));
	});
	const activeHighlightGeometry = await revealedModules.evaluateAll((elements) => ({
		gaps: elements.slice(1).map((element, index) => {
			const previous = elements[index]!.getBoundingClientRect();
			return element.getBoundingClientRect().left - previous.right;
		}),
		widths: elements.map((element) => element.getBoundingClientRect().width),
	}));
	const activeHighlightStyle = await highlightedModule.evaluate((element) => {
		const icon = element.querySelector('span');
		const style = getComputedStyle(element);
		const iconStyle = icon ? getComputedStyle(icon) : null;
		return {
			backgroundColor: style.backgroundColor,
			borderColor: style.borderColor,
			boxShadow: style.boxShadow,
			iconBackgroundColor: iconStyle?.backgroundColor,
			iconColor: iconStyle?.color,
		};
	});
	expect(activeHighlightGeometry).toEqual(restingHighlightGeometry);
	expect(activeHighlightStyle.backgroundColor).toBe(restingHighlightStyle.backgroundColor);
	expect(activeHighlightStyle.iconBackgroundColor).toBe(restingHighlightStyle.iconBackgroundColor);
	expect(activeHighlightStyle.iconColor).toBe(restingHighlightStyle.iconColor);
	expect(activeHighlightStyle.borderColor).not.toBe(restingHighlightStyle.borderColor);
	expect(activeHighlightStyle.boxShadow).not.toBe('none');
	await index.locator('.thought-transcript summary').click();
	await expect(index.locator('.thought-transcript li').first()).toBeVisible();
	await index.getByRole('button', { name: en['thoughtIndex.backMenu'] }).click();
	await expect(entry).toBeFocused();
	expect(pageErrors).toEqual([]);
});

test('mobile setup keeps primary controls reachable', async ({ page }) => {
	await prepareReturningPlayer(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	const modeGroup = page.getByRole('group', { name: en['levelSelect.modeLabel'] });
	await expect(modeGroup.getByRole('button', { name: textPattern(en['levelSelect.standardTitle']) })).toBeVisible();
	await expect(modeGroup.getByRole('button', { name: textPattern(en['levelSelect.creativeTitle']) })).toBeVisible();
	await expect(page.getByRole('button', { name: textPattern(en['levelSelect.startAction']) })).toBeVisible();
	await modeGroup.getByRole('button', { name: textPattern(en['levelSelect.creativeTitle']) }).click();
	await expect(page.getByRole('button', { name: textPattern(en['levelSelect.startAction']) })).toContainText(
		en['levelSelect.creativeTitle'],
	);
	await page.getByRole('button', { name: en['settings.title'] }).click();
	await page.getByRole('button', { name: zhCN['lang.name'] }).click();
	await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
	await expect(page.getByRole('button', { name: textPattern(zhCN['levelSelect.startAction']) })).toBeVisible();
});

test('compact landscape hides home metadata and contains the signal compendium', async ({ page }) => {
	await prepareReturningPlayer(page);
	await page.setViewportSize({ width: 1133, height: 744 });
	await page.goto('/');
	await page.getByRole('button', { name: textPattern(en['levelSelect.creativeTitle']) }).click();

	await expect(page.locator('.home-meta')).toBeHidden();
	expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
	await page.getByRole('button', { name: en['signalArchive.entryAria'] }).click();
	await expect(page.getByRole('heading', { name: en['signalArchive.title'] })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
	const indexHeading = page.locator('.signal-archive-index-head');
	const indexList = page.locator('.signal-archive-index-list');
	const headingTop = await indexHeading.evaluate((element) => element.getBoundingClientRect().top);
	const selected = await indexList.locator('[aria-current="true"]').textContent();
	await page.keyboard.press('ArrowDown');
	await expect.poll(() => indexList.evaluate((element) => element.scrollTop)).toBe(72);
	await page.keyboard.press('ArrowDown');
	await expect.poll(() => indexList.evaluate((element) => element.scrollTop)).toBe(144);
	await page.keyboard.press('ArrowUp');
	await expect.poll(() => indexList.evaluate((element) => element.scrollTop)).toBe(72);
	expect(await indexList.locator('[aria-current="true"]').textContent()).toBe(selected);
	await indexList.getByRole('button').first().click();
	const afterClick = await indexList.evaluate((element) => element.scrollTop);
	await page.keyboard.press('ArrowDown');
	await expect.poll(() => indexList.evaluate((element) => element.scrollTop)).toBe(afterClick + 72);
	expect(await indexList.locator('[aria-current="true"]').textContent()).toBe(selected);
	const beforeHorizontal = await indexList.evaluate((element) => element.scrollTop);
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('ArrowLeft');
	expect(await indexList.evaluate((element) => element.scrollTop)).toBe(beforeHorizontal);
	await expect(indexList.getByRole('button').first()).toHaveAttribute('aria-current', 'true');
	await expect(indexList.getByRole('button').first()).toBeFocused();
	await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
	const beforeBlurredScroll = await indexList.evaluate((element) => element.scrollTop);
	await page.keyboard.press('ArrowDown');
	await expect.poll(() => indexList.evaluate((element) => element.scrollTop)).toBe(beforeBlurredScroll + 72);
	expect(await indexHeading.evaluate((element) => element.getBoundingClientRect().top)).toBe(headingTop);
	expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
});

test('compact landscape gives workshop module cards readable widths', async ({ page }) => {
	await prepareReturningPlayer(page);
	await page.setViewportSize({ width: 1133, height: 744 });
	await page.goto('/');
	await page.getByRole('button', { name: textPattern(en['levelSelect.creativeTitle']) }).click();
	await page.getByRole('button', { name: textPattern(en['levelSelect.startAction']) }).click();
	await clickBattlefieldAt(page, towerPad(defaultLevel, 0));

	const grid = page.getByLabel(en['workshop.aria']).locator('.module-grid.all-modules');
	const columnCount = await grid.evaluate(
		(element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
	);
	expect(columnCount).toBe(4);
	expect((await grid.locator('.module-card').first().boundingBox())?.width ?? 0).toBeGreaterThan(150);
});

test('compact portrait keeps the creative orchestration controls inside the workshop', async ({ page }) => {
	await prepareReturningPlayer(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.getByRole('button', { name: textPattern(en['levelSelect.creativeTitle']) }).click();
	await page.getByRole('button', { name: textPattern(en['levelSelect.startAction']) }).click();
	await clickBattlefieldAt(page, towerPad(defaultLevel, 0));

	const workshop = page.getByLabel(en['workshop.aria']);
	const actions = workshop.locator('.orchestration-actions');
	const importButton = actions.getByRole('button', { name: en['workshop.import'] });
	await expect(importButton).toBeVisible();
	await expect(actions.getByRole('button', { name: en['workshop.export'] })).toBeVisible();
	await expect(importButton).toHaveCSS('border-top-width', '2px');
	await expect(importButton).toHaveCSS('background-color', 'rgb(255, 255, 255)');
	await importButton.hover();
	await expect(importButton).toHaveCSS('background-color', 'rgb(255, 212, 71)');
	const clearButton = actions.getByRole('button', { name: en['workshop.clear'] });
	await clearButton.hover();
	await expect(clearButton).toHaveCSS('background-color', 'rgb(255, 99, 122)');
	const actionBounds = await actions.boundingBox();
	const workshopBounds = await workshop.boundingBox();
	expect(actionBounds?.width).toBeLessThanOrEqual(workshopBounds?.width ?? 0);
});

test('the multi-entrance sector renders its route tree and all battlefield entrances', async ({ page }) => {
	await prepareReturningPlayer(page);
	await page.goto('/');
	await page.getByRole('button', { name: en['levelSelect.nextLevels'] }).click();
	await page.getByRole('button', { name: en['levelSelect.nextLevels'] }).click();
	const triune = page.getByRole('radio', { name: textPattern(en['levels.triune-delta.name']) });
	await expect(triune).toBeVisible();
	await expect(triune.getByText(translate('levelSelect.waves', { count: triuneLevel.waves.length }))).toBeVisible();
	await expect(triune.locator('[data-route-edge]')).toHaveCount(triuneLevel.graph.edges.length);
	const junctionCount = [...triuneLevel.graph.nodes.values()].filter((node) => node.children.length > 1).length;
	await expect(triune.locator('[data-route-junction]')).toHaveCount(junctionCount);
	await triune.click();
	await page.getByRole('button', { name: textPattern(en['levelSelect.creativeTitle']) }).click();
	await page.getByRole('button', { name: textPattern(en['levelSelect.startAction']) }).click();

	await expect(
		page.getByRole('heading', {
			name: `${en['levels.triune-delta.name']} ${triuneLevel.sector.replace('SECTOR ', '')}`,
			level: 1,
		}),
	).toBeVisible();
	await expect(page.locator('[data-battlefield-spawn]')).toHaveCount(triuneLevel.graph.entrances.length);
	for (const [type, count] of configuredSignalCounts(triuneLevel, 0)) {
		const preview = page.locator(`[data-signal-preview] button:has([data-signal-type="${type}"])`);
		await expect(preview).toBeVisible();
		await expect(preview).toContainText(`×${count}`);
	}
});

test('signal compendium exposes every signal profile from its own entry', async ({ page }) => {
	await prepareReturningPlayer(page);
	await page.goto('/');
	await page.getByRole('button', { name: en['signalArchive.entryAria'] }).click();
	await expect(page.getByRole('heading', { name: en['signalArchive.title'] })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
	const index = page.getByRole('navigation', { name: en['signalArchive.indexAria'] });
	const consoleFrame = page.locator('.signal-archive-console');
	const initialFrameHeight = await consoleFrame.evaluate((element) => element.getBoundingClientRect().height);
	await expect(index.getByRole('button')).toHaveCount(signalTypes.length);
	await expect(page.locator('.signal-archive-seal b')).toHaveText(archiveNumber('spark'));
	await index.getByRole('button', { name: textPattern(en['signals.surge']) }).click();
	await expect(page.getByRole('heading', { name: en['signals.surge'] })).toBeVisible();
	await expect(page.locator('.signal-archive-seal b')).toHaveText(archiveNumber('surge'));
	await expect(page.getByText(en['signalArchive.abilities.waveAdvance'])).toBeVisible();
	await expect(page.locator('[data-stat="speed"] strong')).toHaveText(
		translate('signalArchive.units.speed', { value: formatValue(signalRegistry.require('surge').stats.speed) }),
	);
	await index.getByRole('button', { name: textPattern(en['signals.crown']) }).click();
	await expect(page.getByRole('heading', { name: en['signals.crown'] })).toBeVisible();
	await expect(page.locator('.signal-archive-seal b')).toHaveText(archiveNumber('crown'));
	await expect(page.getByText(en['signalArchive.abilities.shield'])).toBeVisible();
	await expect(page.locator('.signal-archive-specimen')).toHaveAttribute('data-has-shield', 'true');
	expect(
		await page
			.locator('.signal-archive-specimen')
			.evaluate(
				(canvas) =>
					canvas instanceof HTMLCanvasElement &&
					canvas.getContext('webgl2') instanceof WebGL2RenderingContext,
			),
	).toBe(true);
	await page.waitForTimeout(1_400);
	await expect(page.locator('.signal-archive-specimen')).toHaveAttribute('data-projectile-visible', 'true');
	await index.getByRole('button', { name: textPattern(en['signals.fracture']) }).click();
	await expect(page.getByRole('heading', { name: en['signals.fracture'] })).toBeVisible();
	await expect(page.locator('.signal-archive-specimen')).toHaveAttribute('data-specimen-count', '1');
	await page.getByRole('button', { name: en['signalArchive.fragments.show'] }).click();
	await expect(page.getByRole('heading', { name: en['signalArchive.fragments.name'] })).toBeVisible();
	const fracture = signalRegistry.require('fracture');
	const split = getSignalCapability(fracture, 'split-on-death');
	if (!split) {
		throw new Error('Expected the fracture signal to define splitting');
	}
	await expect(page.locator('.signal-archive-specimen')).toHaveAttribute('data-specimen-count', String(split.count));
	await expect(page.locator('[data-stat="health"] strong')).toHaveText(
		formatValue(Math.max(1, Math.round(fracture.stats.health * split.healthScale))),
	);
	await expect(page.locator('[data-stat="speed"] strong')).toHaveText(
		translate('signalArchive.units.speed', { value: formatValue(fracture.stats.speed * split.speedScale) }),
	);
	await expect(page.locator('[data-stat="reward"] strong')).toHaveText(
		translate('signalArchive.units.reward', {
			value: formatValue(Math.max(1, Math.round(fracture.stats.reward * split.rewardScale))),
		}),
	);
	await expect(page.locator('[data-stat="coreDamage"] strong')).toHaveText(
		formatValue(Math.max(1, Math.round(fracture.stats.coreDamage * split.coreDamageScale))),
	);
	await page.getByRole('button', { name: en['signalArchive.fragments.restore'] }).click();
	await expect(page.getByRole('heading', { name: en['signals.fracture'] })).toBeVisible();
	await expect(page.locator('.signal-archive-specimen')).toHaveAttribute('data-specimen-count', '1');
	await index.getByRole('button', { name: textPattern(en['signals.anvil']) }).click();
	await expect(page.getByRole('heading', { name: en['signals.anvil'] })).toBeVisible();
	await expect(page.locator('.signal-archive-seal b')).toHaveText(archiveNumber('anvil'));
	await expect(page.getByText(en['signalArchive.abilities.layeredArmor'])).toBeVisible();
	await expect(page.locator('[data-stat="health"] strong')).toHaveText(
		formatValue(signalRegistry.require('anvil').stats.health),
	);
	await expect(page.locator('[data-stat="speed"] strong')).toHaveText(
		translate('signalArchive.units.speed', { value: formatValue(signalRegistry.require('anvil').stats.speed) }),
	);
	await index.getByRole('button', { name: textPattern(en['signals.radiant']) }).click();
	await expect(page.getByRole('heading', { name: en['signals.radiant'] })).toBeVisible();
	await expect(page.locator('.signal-archive-seal b')).toHaveText(archiveNumber('radiant'));
	await expect(page.locator('.signal-archive-specimen')).toHaveAttribute('data-suppressed-tower', 'false');
	await page.getByRole('button', { name: en['signalArchive.suppressedTower.show'] }).click();
	await expect(page.getByRole('heading', { name: en['signalArchive.suppressedTower.name'] })).toBeVisible();
	await expect(page.locator('.signal-archive-specimen')).toHaveAttribute('data-suppressed-tower', 'true');
	const aura = getSignalCapability(signalRegistry.require('radiant'), 'tower-suppression-aura');
	if (!aura) {
		throw new Error('Expected the radiant signal to define suppression');
	}
	await expect(page.locator('[data-stat="suppressedCooldown"] strong')).toHaveText(
		`${formatValue(aura.cooldownMultiplier)}×`,
	);
	await expect(page.locator('[data-stat="suppressedRegen"] strong')).toHaveText(
		`${Math.round(aura.energyRegenMultiplier * 100)}%`,
	);
	await expect(page.locator('[data-stat="health"]')).toHaveCount(0);
	await page.getByRole('button', { name: en['signalArchive.suppressedTower.restore'] }).click();
	await expect(page.getByRole('heading', { name: en['signals.radiant'] })).toBeVisible();
	const longNameFrameHeight = await consoleFrame.evaluate((element) => element.getBoundingClientRect().height);
	expect(longNameFrameHeight).toBeCloseTo(initialFrameHeight, 0);
	await page.getByRole('button', { name: en['settings.title'] }).click();
	await page.getByRole('button', { name: zhCN['lang.name'] }).click();
	await expect(page.getByRole('heading', { name: textPattern(zhCN['signalArchive.entry']) })).toBeVisible();
	await page.getByRole('button', { name: zhCN['settings.close'] }).click();
	await page.getByRole('button', { name: textPattern(zhCN['signalArchive.back']) }).click();
	await expect(
		page.getByRole('region', { name: textPattern(zhCN['levelSelect.sectorSelectionHeading']) }),
	).toBeVisible();
});

test('defense archive reads, filters, details, and clears IndexedDB records', async ({ page }) => {
	await prepareReturningPlayer(page);
	await page.goto('/');
	await page.evaluate(async () => {
		const database = await new Promise<IDBDatabase>((resolve, reject) => {
			const request = indexedDB.open('prism-bastion-defense-archive', 1);
			request.onupgradeneeded = () => {
				const defenses = request.result.createObjectStore('defenses', { keyPath: 'id' });
				defenses.createIndex('endedAt', 'endedAt');
				defenses.createIndex('result', 'result');
				defenses.createIndex('levelId', 'levelId');
				defenses.createIndex('difficultyId', 'difficultyId');
				request.result.createObjectStore('achievementState', { keyPath: 'id' });
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
		await new Promise<void>((resolve, reject) => {
			const transaction = database.transaction('defenses', 'readwrite');
			transaction.objectStore('defenses').add({
				id: 'e2e-defense',
				schemaVersion: 1,
				runId: 'e2e-defense',
				startedAt: 1_700_000_000_000,
				endedAt: 1_700_000_120_000,
				simulationSeconds: 210,
				result: 'won',
				mode: 'standard',
				tutorial: false,
				levelId: 'white-prism',
				difficultyId: 'hard',
				waveReached: 5,
				maxWaves: 5,
				score: 2345,
				core: 17,
				maxCore: 20,
				shards: 51,
				waves: [
					{
						wave: 1,
						enemies: {
							spark: { spawned: 5, defeated: 4, leaked: 1, remaining: 0, queued: 0, coreDamage: 3 },
						},
					},
				],
				inventory: [
					{ moduleId: 'pulse', count: 3 },
					{ moduleId: 'frost', count: 2 },
				],
				towers: [{ padIndex: 0, level: 3, targeting: 'hp-highest', slots: ['frost', 'pulse', null] }],
				build: { commit: 'e2e1234', commitDate: '2026-08-31' },
			});
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
		database.close();
	});

	await page.getByRole('button', { name: en['defenseArchive.entryAria'] }).click();
	await expect(page.getByRole('heading', { name: en['defenseArchive.title'] })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
	await expect(page.getByText(en['defenseArchive.tab.sectors'])).toBeVisible();
	await expect(page.locator('[data-defense-metric="defenses"] strong')).toHaveText('1');
	await page.getByRole('tab', { name: en['defenseArchive.tab.sectors'] }).click();
	await expect(page.getByRole('heading', { name: en['levels.white-prism.name'] })).toBeVisible();
	expect(
		await page
			.locator('.sector-archive-record')
			.evaluate(
				(element) =>
					getComputedStyle(element).overflowY === 'auto' && element.scrollHeight > element.clientHeight,
			),
	).toBe(true);
	expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
	await expect(page.getByText(en['defenseArchive.sectors.waveAnalysis'])).toBeVisible();
	await expect(page.getByText(en['defenseArchive.sectors.signalStatsDetail'])).toBeVisible();
	await page.getByRole('tab', { name: en['defenseArchive.tab.achievements'] }).click();
	await page.getByRole('tab', { name: textPattern(en['defenseArchive.tab.history']) }).click();
	await page.getByLabel(en['defenseArchive.filter.difficulty']).selectOption('hard');
	await page.getByRole('button', { name: textPattern(en['levels.white-prism.name']) }).click();
	await expect(page.getByText('e2e1234 · 2026-08-31')).toBeVisible();
	await expect(page.getByText(en['defenseArchive.detail.inventory'])).toBeVisible();
	expect(await page.locator('[data-defense-detail]').evaluate((element) => getComputedStyle(element).overflowY)).toBe(
		'auto',
	);
	expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
	await page.getByRole('button', { name: en['settings.title'] }).click();
	const settings = page.getByRole('dialog', { name: en['settings.title'] });
	await settings.getByRole('tab', { name: en['settings.categories.storage'] }).click();
	await settings.getByRole('button', { name: en['defenseArchive.clear'] }).click();
	await expect(page.getByRole('dialog')).toHaveCount(1);
	await settings.getByRole('button', { name: en['settings.clearDefenseArchiveAgain'] }).click();
	await expect(settings.getByRole('button', { name: en['settings.defenseArchiveCleared'] })).toBeVisible();
	await settings.getByRole('button', { name: en['settings.close'] }).click();
	await expect(page.getByRole('tab', { name: textPattern(en['defenseArchive.tab.history']) })).toContainText('0');
});

test('creative economy and signal controls are independent from the workshop', async ({ page }) => {
	await prepareReturningPlayer(page);
	await page.goto('/');
	await page.getByRole('button', { name: textPattern(en['levelSelect.creativeTitle']) }).click();
	await expect(page.getByRole('spinbutton', { name: en['levelSelect.coreStability'] })).toBeVisible();
	await expect(page.getByRole('button', { name: textPattern(en['levelSelect.startAction']) })).toContainText(
		en['levelSelect.creativeTitle'],
	);
	await page.getByRole('spinbutton', { name: en['levelSelect.coreStability'] }).fill('35');
	await page.getByRole('spinbutton', { name: en['levelSelect.waveCount'] }).fill('5');
	await page.getByRole('button', { name: textPattern(en['levelSelect.startAction']) }).click();

	await expect(page.getByText('∞', { exact: true })).toBeVisible();
	await expect(page.locator('.core-metric strong')).toHaveText('35/35');
	await expect(page.locator('.wave-metric strong')).toHaveText('0/5');
	const signalButton = page.getByRole('button', { name: en['battlefield.signalConsole'] });
	await expect(signalButton).toBeVisible();
	await signalButton.click();
	const signalConsole = page.getByRole('dialog', { name: en['creativeLab.title'] });
	await expect(signalConsole).toBeVisible();
	await page.locator('[data-battlefield-state]').click();
	await expect(signalConsole).toHaveCount(0);

	await signalButton.click();
	await page.getByRole('button', { name: en['creativeLab.close'] }).click();
	await expect(signalConsole).toHaveCount(0);

	await clickBattlefieldAt(page, towerPad(defaultLevel, 0));
	await expect(page.getByLabel(en['workshop.aria']).locator('.creative-lab')).toHaveCount(0);
});

test('level carousel keeps three cards visible and launches the beginner map', async ({ page }) => {
	test.slow();
	await prepareReturningPlayer(page);
	await page.goto('/');
	const levelGroup = page.getByRole('radiogroup', { name: en['levelSelect.chooseLevel'] });
	await expect(levelGroup.getByRole('radio')).toHaveCount(3);
	await expect(page.getByRole('radio', { name: textPattern(en['levels.starter-elbow.name']) })).toBeVisible();

	await page.getByRole('button', { name: en['levelSelect.nextLevels'] }).click();
	await expect(levelGroup.getByRole('radio')).toHaveCount(3);
	await expect(page.getByRole('radio', { name: textPattern(en['levels.verdant-fold.name']) })).toBeVisible();
	await page.getByRole('button', { name: en['levelSelect.previousLevels'] }).click();

	await page.getByRole('radio', { name: textPattern(en['levels.starter-elbow.name']) }).click();
	await page.getByRole('button', { name: textPattern(en['levelSelect.startAction']) }).click();
	await expect(
		page.getByRole('heading', {
			name: `${en['levels.starter-elbow.name']} ${tutorialLevel.sector.replace('SECTOR ', '')}`,
			level: 1,
		}),
	).toBeVisible();
	const tutorial = page.getByRole('region', { name: en['tutorial.aria'] });
	await expect(tutorial.getByRole('heading', { name: en['tutorial.steps.welcome.title'] })).toBeVisible();
	const tutorialCard = tutorial.locator('[data-tutorial-panel]');
	const initialCardBox = await tutorialCard.boundingBox();
	const dragHandleBox = await tutorial.getByRole('button', { name: en['tutorial.dragAria'] }).boundingBox();
	if (!initialCardBox || !dragHandleBox) {
		throw new Error('Expected a draggable tutorial card');
	}
	const viewport = page.viewportSize();
	if (!viewport) {
		throw new Error('Expected a viewport');
	}
	expect(initialCardBox.x + initialCardBox.width / 2).toBeCloseTo(viewport.width / 2, 0);
	expect(initialCardBox.y + initialCardBox.height / 2).toBeCloseTo(viewport.height / 2, 0);
	await page.mouse.move(dragHandleBox.x + dragHandleBox.width / 2, dragHandleBox.y + dragHandleBox.height / 2);
	await page.mouse.down();
	await page.mouse.move(dragHandleBox.x + dragHandleBox.width / 2, dragHandleBox.y - 90, { steps: 5 });
	await page.mouse.up();
	await expect.poll(async () => (await tutorialCard.boundingBox())?.x ?? 0).toBeCloseTo(initialCardBox.x, 0);
	const movedCardBox = await tutorialCard.boundingBox();
	expect(movedCardBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(initialCardBox.y - 30);
	await tutorial.getByRole('button', { name: en['tutorial.steps.welcome.continue'] }).click();
	await expect
		.poll(async () => {
			const box = await tutorialCard.boundingBox();
			return box ? viewport.width - box.x - box.width : Number.POSITIVE_INFINITY;
		})
		.toBeCloseTo(20, 0);
	const cornerCardBox = await tutorialCard.boundingBox();
	if (!cornerCardBox) {
		throw new Error('Expected the tutorial card in the lower-right corner');
	}
	expect(viewport.width - cornerCardBox.x - cornerCardBox.width).toBeCloseTo(20, 0);
	expect(viewport.height - cornerCardBox.y - cornerCardBox.height).toBeCloseTo(20, 0);
	await tutorial.getByRole('button', { name: en['tutorial.steps.tower.instruction'] }).click();
	let workshop = page.getByLabel(en['workshop.aria']);
	await expect(tutorial.locator('[data-tutorial-spotlight="source"]')).toHaveCount(1);
	await expect(tutorial.locator('[data-tutorial-spotlight="destination"]')).toHaveCount(1);
	await workshop.locator('[data-tutorial-module="frost"]').dragTo(workshop.locator('[data-tutorial-slot="0"]'));
	await expect(tutorial.getByRole('heading', { name: en['tutorial.steps.pulse-drag-first.title'] })).toBeVisible();
	await workshop.locator('[data-tutorial-module="pulse"]').dragTo(workshop.locator('[data-tutorial-slot="1"]'));
	await tutorial.getByRole('button', { name: en['tutorial.steps.first-program.continue'] }).click();
	await tutorial.getByRole('button', { name: en['tutorial.steps.close-first-workshop.instruction'] }).click();
	await expect(page.getByLabel(en['workshop.aria'])).toHaveCount(0);
	await tutorial.getByRole('button', { name: en['tutorial.steps.build-second-tower.instruction'] }).click();
	workshop = page.getByLabel(en['workshop.aria']);
	await expect(tutorial.getByRole('heading', { name: en['tutorial.steps.second-pulse-drag.title'] })).toBeVisible();
	await workshop.locator('[data-tutorial-module="pulse"]').dragTo(workshop.locator('[data-tutorial-slot="0"]'));
	await tutorial.getByRole('button', { name: en['tutorial.steps.close-second-workshop.instruction'] }).click();
	await tutorial.getByRole('button', { name: en['tutorial.steps.launch-one.instruction'] }).click();

	await expect(page.getByText(en['tutorial.steps.wait-first-wave.title'])).toBeVisible();
	await expect(tutorialCard).toContainText(en['tutorial.steps.wait-first-wave.title']);
	const waveCardBox = await tutorialCard.boundingBox();
	if (!waveCardBox) {
		throw new Error('Expected the standard tutorial card during wave one');
	}
	expect(viewport.width - waveCardBox.x - waveCardBox.width).toBeCloseTo(20, 0);
	expect(viewport.height - waveCardBox.y - waveCardBox.height).toBeCloseTo(20, 0);
	await page.getByRole('button', { name: '2×' }).click();
	await clickBattlefieldAt(page, towerPad(tutorialLevel, 1));
	await expect(workshop.locator('.tower-id')).toHaveText(translate('tower.nodeNumber', { id: '02' }));
	await expect(page.locator('[data-battlefield-live]')).not.toHaveAttribute('data-combat', 'true');
	await page.getByRole('button', { name: en['workshop.close'] }).click();
	await expect(tutorial.getByRole('heading', { name: en['tutorial.steps.ensure-tower.title'] })).toBeVisible({
		timeout: 45_000,
	});
	await clickBattlefieldAt(page, towerPad(tutorialLevel, 1));
	await expect(tutorial.getByRole('heading', { name: en['tutorial.steps.ensure-wrong-tower.title'] })).toBeVisible({
		timeout: 45_000,
	});
	await tutorial.getByRole('button', { name: en['tutorial.steps.ensure-wrong-tower.instruction'] }).click();
	await expect(tutorial.getByRole('heading', { name: en['tutorial.steps.ensure-tower.title'] })).toBeVisible();
	await tutorial.getByRole('button', { name: en['tutorial.steps.ensure-tower.instruction'] }).click();
	workshop = page.getByLabel(en['workshop.aria']);
	await expect(tutorial.getByRole('heading', { name: en['tutorial.steps.move-pulse.title'] })).toBeVisible();
	await workshop.locator('[data-tutorial-slot="1"]').dragTo(workshop.locator('[data-tutorial-slot="2"]'));
	await expect(tutorial.getByRole('heading', { name: en['tutorial.steps.trigger-drag.title'] })).toBeVisible();
	await workshop
		.locator('[data-tutorial-module="impact-trigger"]')
		.dragTo(workshop.locator('[data-tutorial-slot="1"]'));
	await expect(tutorial.getByRole('heading', { name: en['tutorial.steps.static-drag.title'] })).toBeVisible();
	await workshop
		.locator('[data-tutorial-module="proximity-mine"]')
		.dragTo(workshop.locator('[data-tutorial-slot="3"]'));
	await tutorial.getByRole('button', { name: en['tutorial.steps.final-program.continue'] }).click();
	await tutorial.getByRole('button', { name: en['tutorial.steps.close-final-workshop.instruction'] }).click();
	await expect(page.getByLabel(en['workshop.aria'])).toHaveCount(0);
	await page.evaluate((key) => localStorage.removeItem(key), TUTORIAL_OFFER_STORAGE_KEY);
	await tutorial.getByRole('button', { name: en['tutorial.steps.launch-two.instruction'] }).click();
	await expect(tutorial).toHaveCount(0);
	await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), TUTORIAL_OFFER_STORAGE_KEY)).toBe('1');
});
