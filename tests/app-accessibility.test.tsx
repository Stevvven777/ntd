// @vitest-environment jsdom

import { translate } from './helpers/translate';

import en from '../packages/web-shared/src/i18n/locales/en.json';
import { textPattern } from './helpers/text';

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@prism-bastion/web-shared/i18n';
import zhCN from '@prism-bastion/web-shared/i18n/locales/zh-CN.json';
import { App, TUTORIAL_OFFER_STORAGE_KEY } from '@prism-bastion/web-single/App';
import { LEVEL_SELECTION_STORAGE_KEY } from '@prism-bastion/web-single/LevelSelect';
import { AUTO_PAUSE_STORAGE_KEY } from '@prism-bastion/web-shared/ui/preferences';
import { LEVELS } from '@prism-bastion/game-core/game/config';
import { levelName } from '@prism-bastion/web-shared/i18n/presentation';

beforeEach(() => {
	try {
		globalThis.localStorage?.removeItem(TUTORIAL_OFFER_STORAGE_KEY);
		globalThis.localStorage?.removeItem(LEVEL_SELECTION_STORAGE_KEY);
		globalThis.localStorage?.removeItem(AUTO_PAUSE_STORAGE_KEY);
	} catch {
		// localStorage is unavailable when jsdom uses an opaque origin.
	}
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	void i18n.changeLanguage('en');
});

describe('level selection accessibility', () => {
	it('routes arrows to the current page across archive entry, return, and lost focus', async () => {
		const values = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => values.set(key, value),
			removeItem: (key: string) => values.delete(key),
		});
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByRole('button', { name: en['tutorialOffer.decline'] }));
		const selectedLevel = () => document.querySelector('[data-level-grid] [aria-checked="true"]')?.textContent;
		await user.keyboard('{ArrowRight}');
		expect(selectedLevel()).toContain(en['levels.rose-circuit.name']);
		await user.click(screen.getByRole('button', { name: en['signalArchive.entryAria'] }));
		const signals = Array.from(document.querySelectorAll<HTMLButtonElement>('.signal-archive-index-list button'));
		await user.keyboard('{ArrowRight}');
		expect(signals[0]?.getAttribute('aria-current')).toBe('true');
		(document.activeElement as HTMLElement).blur();
		await user.keyboard('{ArrowRight}');
		expect(signals[0]?.getAttribute('aria-current')).toBe('true');
		await user.click(screen.getByRole('button', { name: en['signalArchive.back'] }));
		await user.keyboard('{ArrowLeft}');
		expect(selectedLevel()).toContain(en['levels.white-prism.name']);
		await user.click(screen.getByRole('button', { name: en['thoughtIndex.entryAria'] }));
		const thoughts = Array.from(document.querySelectorAll<HTMLButtonElement>('.thought-records button'));
		await user.keyboard('{ArrowRight}');
		expect(document.activeElement).toBe(thoughts[1]);
		expect(selectedLevel()).toContain(en['levels.white-prism.name']);
		await user.click(screen.getByRole('button', { name: en['thoughtIndex.backMenu'] }));
		await user.keyboard('{ArrowRight}');
		expect(selectedLevel()).toContain(en['levels.rose-circuit.name']);
		await user.click(screen.getByRole('button', { name: en['settings.title'] }));
		await user.keyboard('{ArrowRight}');
		expect(selectedLevel()).toContain(en['levels.rose-circuit.name']);
	});

	it.each([false, true])(
		'keeps arrow navigation focused across pages and stops at boundaries (compact: %s)',
		async (compact) => {
			vi.stubGlobal(
				'matchMedia',
				vi.fn((query: string) => ({
					matches: compact && query === '(max-width: 980px)',
					media: query,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
				})),
			);
			const user = userEvent.setup();
			render(<App />);
			await user.click(screen.getByRole('button', { name: en['tutorialOffer.decline'] }));
			const group = () => screen.getByRole('radiogroup', { name: en['levelSelect.chooseLevel'] });
			const firstVisible = within(group()).getAllByRole('radio')[0]!;
			const firstIndex = compact ? 1 : 0;
			await user.click(firstVisible);
			let index = firstIndex;
			for (const direction of [1, -1]) {
				for (let step = 1; step <= LEVELS.length; step += 1) {
					await user.keyboard(direction === 1 ? '{ArrowRight}' : '{ArrowLeft}');
					index = Math.max(0, Math.min(LEVELS.length - 1, index + direction));
					const selected = within(group()).getByRole('radio', { checked: true });
					expect(selected.textContent).toContain(levelName(i18n.t, LEVELS[index]!.id));
					expect(document.activeElement).toBe(selected);
				}
			}
		},
	);

	it('selects visible edge cards without moving the carousel', async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByRole('button', { name: en['tutorialOffer.decline'] }));
		const group = screen.getByRole('radiogroup', { name: en['levelSelect.chooseLevel'] });
		const cards = within(group).getAllByRole('radio');
		for (const card of [cards[2]!, cards[0]!]) {
			await user.click(card);
			expect(within(group).getByRole('radio', { checked: true })).toBe(card);
			expect(within(group).getAllByRole('radio')).toEqual(cards);
		}
		await user.keyboard('{ArrowRight}{ArrowRight}');
		expect(document.activeElement).toBe(cards[2]);
		expect(within(group).getAllByRole('radio')).toEqual(cards);
	});

	it('remembers the last selected mode, difficulty, and level', async () => {
		const storedValues = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storedValues.get(key) ?? null,
			setItem: (key: string, value: string) => storedValues.set(key, value),
			removeItem: (key: string) => storedValues.delete(key),
		});
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByRole('button', { name: en['tutorialOffer.decline'] }));

		const difficultyGroup = screen.getByRole('radiogroup', { name: en['levelSelect.chooseDifficulty'] });
		await user.click(difficultyGroup.querySelectorAll('[role="radio"]')[3] as HTMLElement);
		await user.click(
			within(screen.getByRole('group', { name: en['levelSelect.modeLabel'] })).getByRole('button', {
				name: textPattern(en['levelSelect.creativeTitle']),
			}),
		);
		await user.click(screen.getByRole('radio', { name: textPattern(en['levels.rose-circuit.name']) }));

		expect(JSON.parse(globalThis.localStorage.getItem(LEVEL_SELECTION_STORAGE_KEY) ?? '{}')).toEqual({
			levelId: 'rose-circuit',
			mode: 'creative',
			difficultyId: 'hard',
		});

		cleanup();
		render(<App />);
		expect(
			within(screen.getByRole('group', { name: en['levelSelect.modeLabel'] }))
				.getByRole('button', { name: textPattern(en['levelSelect.creativeTitle']) })
				.getAttribute('aria-pressed'),
		).toBe('true');
		expect(screen.queryByRole('radiogroup', { name: en['levelSelect.chooseDifficulty'] })).toBeNull();
		await user.click(
			within(screen.getByRole('group', { name: en['levelSelect.modeLabel'] })).getByRole('button', {
				name: textPattern(en['levelSelect.standardTitle']),
			}),
		);
		expect(
			screen
				.getByRole('radiogroup', { name: en['levelSelect.chooseDifficulty'] })
				.querySelector('[aria-checked="true"]')?.textContent,
		).toContain(en['difficulties.hard.name']);
		const restoredLevelCards = screen
			.getByRole('radiogroup', { name: en['levelSelect.chooseLevel'] })
			.querySelectorAll('[role="radio"]');
		expect(restoredLevelCards[1]?.getAttribute('aria-checked')).toBe('true');
		expect(restoredLevelCards[1]?.textContent).toContain(en['levels.rose-circuit.name']);
	});

	it('exposes mode state and supports arrow-key radio selection', async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByRole('button', { name: en['tutorialOffer.decline'] }));

		const modeGroup = screen.getByRole('group', { name: en['levelSelect.modeLabel'] });
		const standardMode = within(modeGroup).getByRole('button', {
			name: textPattern(en['levelSelect.standardTitle']),
		});
		const creativeMode = within(modeGroup).getByRole('button', {
			name: textPattern(en['levelSelect.creativeTitle']),
		});
		expect(standardMode.getAttribute('aria-pressed')).toBe('true');
		await user.click(creativeMode);
		expect(creativeMode.getAttribute('aria-pressed')).toBe('true');
		expect(screen.queryByRole('radiogroup', { name: en['levelSelect.chooseDifficulty'] })).toBeNull();
		expect(screen.getByRole('spinbutton', { name: en['levelSelect.coreStability'] })).toBeTruthy();
		await user.click(standardMode);

		const difficultyGroup = screen.getByRole('radiogroup', { name: en['levelSelect.chooseDifficulty'] });
		const selectedDifficulty = difficultyGroup.querySelector<HTMLElement>('[aria-checked="true"]');
		expect(selectedDifficulty?.textContent).toContain(en['difficulties.normal.name']);
		selectedDifficulty?.focus();
		await user.keyboard('{ArrowDown}');
		expect(difficultyGroup.querySelector('[aria-checked="true"]')?.textContent).toContain(
			en['difficulties.hard.name'],
		);

		const levelGroup = screen.getByRole('radiogroup', { name: en['levelSelect.chooseLevel'] });
		const selectedLevel = levelGroup.querySelector<HTMLElement>('[aria-checked="true"]');
		expect(selectedLevel?.textContent).toContain(en['levels.white-prism.name']);
		selectedLevel?.focus();
		await user.keyboard('{ArrowRight}');
		expect(
			screen
				.getByRole('radiogroup', { name: en['levelSelect.chooseLevel'] })
				.querySelector('[aria-checked="true"]')?.textContent,
		).toContain(en['levels.rose-circuit.name']);
	});

	it('shows three level cards at a time and pages with arrow controls', async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByRole('button', { name: en['tutorialOffer.decline'] }));

		let group = screen.getByRole('radiogroup', { name: en['levelSelect.chooseLevel'] });
		expect(group.querySelectorAll('[role="radio"]')).toHaveLength(3);
		expect(group.textContent).toContain(en['levels.starter-elbow.name']);
		expect(group.textContent).not.toContain(en['levels.verdant-fold.name']);

		await user.click(screen.getByRole('button', { name: en['levelSelect.nextLevels'] }));
		group = screen.getByRole('radiogroup', { name: en['levelSelect.chooseLevel'] });
		expect(group.querySelectorAll('[role="radio"]')).toHaveLength(3);
		expect(group.getAttribute('data-carousel-direction')).toBe('next');
		expect(group.textContent).not.toContain(en['levels.starter-elbow.name']);
		expect(group.textContent).toContain(en['levels.verdant-fold.name']);
	});

	it('shows one selected level card at a time at 949px wide', async () => {
		const viewportWidth = 949;
		vi.stubGlobal(
			'matchMedia',
			vi.fn(
				(query: string) =>
					({
						matches: query === '(max-width: 980px)' && viewportWidth <= 980,
						media: query,
						onchange: null,
						addEventListener: vi.fn(),
						removeEventListener: vi.fn(),
						addListener: vi.fn(),
						removeListener: vi.fn(),
						dispatchEvent: vi.fn(() => true),
					}) satisfies MediaQueryList,
			),
		);
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByRole('button', { name: en['tutorialOffer.decline'] }));

		let group = screen.getByRole('radiogroup', { name: en['levelSelect.chooseLevel'] });
		expect(group.querySelectorAll('[role="radio"]')).toHaveLength(1);
		expect(group.textContent).toContain(en['levels.white-prism.name']);

		await user.click(screen.getByRole('button', { name: en['levelSelect.nextLevels'] }));
		group = screen.getByRole('radiogroup', { name: en['levelSelect.chooseLevel'] });
		expect(group.querySelectorAll('[role="radio"]')).toHaveLength(1);
		expect(group.textContent).toContain(en['levels.rose-circuit.name']);
	});

	it('switches the complete interface language and updates the document locale', async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByRole('button', { name: en['tutorialOffer.decline'] }));

		await user.click(screen.getByRole('button', { name: en['settings.title'] }));
		await user.click(screen.getByRole('button', { name: zhCN['lang.name'] }));

		expect(document.documentElement.lang).toBe('zh-CN');
		expect(screen.getByRole('dialog', { name: zhCN['settings.title'] })).toBeTruthy();
		expect(screen.getByRole('button', { name: zhCN['settings.close'] })).toBeTruthy();
		expect(screen.getByRole('heading', { name: zhCN['levelSelect.gameTitle'] })).toBeTruthy();
		expect(screen.getByText(zhCN['levelSelect.sectorSelectionHeading'])).toBeTruthy();
	});

	it('opens the selected next-wave signal in the compendium and returns to the same run', async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByRole('button', { name: en['tutorialOffer.decline'] }));
		await user.click(screen.getByRole('button', { name: textPattern(en['levelSelect.startAction']) }));

		const draft = screen.getByRole('region', { name: en['reward.initialAria'] });
		await user.click(within(draft).getAllByRole('button', { name: en['reward.choose'] })[0]);
		expect(within(draft).getByText('2 / 3')).toBeTruthy();

		await user.click(
			screen.getByRole('button', {
				name: translate('battlefield.openSignalArchive', { signal: en['signals.crown'] }),
			}),
		);
		expect(screen.getByRole('heading', { name: en['signals.crown'] })).toBeTruthy();

		await user.click(screen.getByRole('button', { name: en['signalArchive.backToBattlefield'] }));
		expect(screen.getByRole('region', { name: en['reward.initialAria'] })).toBeTruthy();
		expect(screen.getByText('2 / 3')).toBeTruthy();
	});
});
