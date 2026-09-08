// @vitest-environment jsdom

import en from '../packages/web-shared/src/i18n/locales/en.json';
import { textPattern } from './helpers/text';

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@prism-bastion/web-shared/i18n';
import zhCN from '@prism-bastion/web-shared/i18n/locales/zh-CN.json';
import { GameEngine } from '@prism-bastion/game-core/game/engine';
import { thoughtRegistry, ThoughtSceneDirector } from '@prism-bastion/web-shared/thoughts';
import { App, TUTORIAL_OFFER_STORAGE_KEY } from '@prism-bastion/web-single/App';
import { RewardDraft } from '@prism-bastion/web-single/RewardDraft';
import { Workshop } from '@prism-bastion/web-shared/ui/Workshop';
import { ProgramReadout } from '@prism-bastion/web-shared/ui/ProgramReadout';
import { ThoughtIndex } from '@prism-bastion/web-shared/ui/ThoughtIndex';

beforeEach(() => {
	const values = new Map<string, string>([[TUTORIAL_OFFER_STORAGE_KEY, '1']]);
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key),
	});
	vi.stubGlobal(
		'requestAnimationFrame',
		vi.fn(() => 1),
	);
	vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(async () => {
	cleanup();
	vi.unstubAllGlobals();
	await i18n.changeLanguage('en');
});

describe('thought index entry points', () => {
	it('navigates records across chapters without triggering playback shortcuts', async () => {
		const user = userEvent.setup();
		const next = vi.spyOn(ThoughtSceneDirector.prototype, 'next');
		const previous = vi.spyOn(ThoughtSceneDirector.prototype, 'previous');
		render(<ThoughtIndex onBack={vi.fn()} />);
		const records = Array.from(document.querySelectorAll<HTMLButtonElement>('.thought-records button'));
		await user.click(records[0]!);
		for (let step = 1; step <= records.length; step += 1) {
			await user.keyboard('{ArrowRight}');
			const selected = records[Math.min(step, records.length - 1)]!;
			expect(document.activeElement).toBe(selected);
			expect(selected.getAttribute('aria-current')).toBe('page');
			expect(document.querySelector('.thought-stage')?.getAttribute('data-thought-id')).toBe(
				selected.dataset.thoughtId,
			);
		}
		await user.keyboard('{ArrowLeft}');
		expect(document.activeElement).toBe(records.at(-2));
		expect(next).not.toHaveBeenCalled();
		expect(previous).not.toHaveBeenCalled();
		await user.keyboard('{PageDown}');
		expect(next).toHaveBeenCalledOnce();
		await user.keyboard('{PageUp}');
		expect(previous).toHaveBeenCalledOnce();
		next.mockRestore();
		previous.mockRestore();
		const search = screen.getByPlaceholderText(en['thoughtIndex.searchPlaceholder']);
		await user.type(search, en['thoughts.pulse.title']);
		await user.keyboard('{ArrowLeft}');
		expect(document.activeElement).toBe(search);
		const onlyRecord = document.querySelector<HTMLButtonElement>('.thought-records button')!;
		await user.click(onlyRecord);
		await user.keyboard('{ArrowDown}{End}{Home}');
		expect(document.activeElement).toBe(onlyRecord);
	});

	it('searches only record names and summaries', async () => {
		const user = userEvent.setup();
		render(<ThoughtIndex onBack={vi.fn()} />);

		expect(document.querySelector('.thought-index-header .thought-index-seal')?.textContent).toBe('');
		const searchBox = screen.getByPlaceholderText(en['thoughtIndex.searchPlaceholder']);
		await user.type(searchBox, en['thoughts.pulse.title']);

		expect(document.querySelectorAll('.thought-records [data-thought-id]')).toHaveLength(1);
		expect(document.querySelector('.thought-records [data-thought-id="pulse"]')).not.toBeNull();

		await user.clear(searchBox);
		await user.type(searchBox, en['modules.frost.short']);
		const shortNameMatch = document.querySelector('.thought-records [data-thought-id="frost"]');
		expect(shortNameMatch).not.toBeNull();
		expect(shortNameMatch?.textContent).not.toContain(en['modules.frost.short']);
	});

	it('searches Chinese record names and summaries by pinyin', async () => {
		await i18n.changeLanguage('zh-CN');
		// Own the phonetic inputs so module copy can change independently of this behavior test.
		i18n.addResources('zh-CN', 'translation', {
			'thoughts.frost.title': String.fromCodePoint(0x6d4b, 0x8bd5),
			'thoughts.pulse.summary': String.fromCodePoint(0x793a, 0x4f8b),
		});
		try {
			const user = userEvent.setup();
			render(<ThoughtIndex onBack={vi.fn()} />);
			const searchBox = screen.getByPlaceholderText(zhCN['thoughtIndex.searchPlaceholder']);

			await user.type(searchBox, 'cs');
			expect(document.querySelector('.thought-records [data-thought-id="frost"]')).not.toBeNull();

			await user.clear(searchBox);
			await user.type(searchBox, 'shili');
			expect(document.querySelector('.thought-records [data-thought-id="pulse"]')).not.toBeNull();
		} finally {
			i18n.addResources('zh-CN', 'translation', {
				'thoughts.frost.title': zhCN['thoughts.frost.title'],
				'thoughts.pulse.summary': zhCN['thoughts.pulse.summary'],
			});
		}
	});

	it('opens from deployment and returns to the mounted selection screen', async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByRole('button', { name: en['thoughtIndex.entryAria'] }));
		expect(screen.getByRole('main', { name: en['thoughtIndex.title'] })).toBeTruthy();
		expect(document.querySelector('.thought-module-badge')).toBeTruthy();
		expect(document.querySelector('[data-thought-scene-overlay]')).toBeTruthy();
		const timeline = screen.getByRole('navigation', { name: en['thoughtIndex.progress'] });
		const units = within(timeline).getAllByRole('button');
		const beats = thoughtRegistry.require('pulse').beats;
		expect(units).toHaveLength(beats.length);
		beats.forEach((beat, index) => expect(units[index]?.style.flexGrow).toBe(String(beat.timelineDuration)));
		const target = units.at(-1);
		if (!target) {
			throw new Error('Expected a timeline unit');
		}
		await user.click(target);
		expect(target.getAttribute('aria-current')).toBe('step');
		await user.click(screen.getByRole('button', { name: en['thoughtIndex.backMenu'] }));
		expect(screen.getByRole('heading', { name: en['levelSelect.gameTitle'] })).toBeTruthy();
	});

	it('renders authored indefinite waits as square timeline markers', async () => {
		const user = userEvent.setup();
		const definition = thoughtRegistry
			.list()
			.find((candidate) => candidate.beats.some((beat) => beat.cues?.some((cue) => cue.timelineWait)));
		if (!definition) {
			throw new Error('Expected an authored indefinite wait');
		}
		render(<App />);
		await user.click(screen.getByRole('button', { name: en['thoughtIndex.entryAria'] }));
		const record = document.querySelector<HTMLElement>(`[data-thought-id="${definition.id}"]`);
		if (!record) {
			throw new Error('Expected the thought record');
		}
		await user.click(record);
		const director = new ThoughtSceneDirector(definition);
		const expectedMarkerCount = director.getTimelineWaitMarkers().length;
		director.dispose();
		expect(document.querySelectorAll('.thought-progress-wait')).toHaveLength(expectedMarkerCount);
	});

	it('only shows a workshop thought action for covered modules', async () => {
		const user = userEvent.setup();
		const engine = new GameEngine({ mode: 'creative', seed: 5 });
		const tower = engine.towers[0];
		if (!tower) {
			throw new Error('Expected a tower');
		}
		engine.selectTower(tower.id);
		const openThought = vi.fn();
		const rendered = render(
			<Workshop engine={engine} tower={tower} view={engine.getViewSnapshot()} onOpenThought={openThought} />,
		);
		await user.click(screen.getByRole('button', { name: en['thoughtIndex.viewThought'] }));
		expect(openThought).toHaveBeenCalledWith('pulse');

		await user.click(screen.getByRole('button', { name: textPattern(en['modules.arcbolt.short']) }));
		const arcboltThought = rendered.queryByRole('button', { name: en['thoughtIndex.viewThought'] });
		expect(arcboltThought).not.toBeNull();
		await user.click(arcboltThought!);
		expect(openThought).toHaveBeenCalledWith('arcbolt');
	});

	it('opens a covered draft thought without consuming the draft choice', async () => {
		const user = userEvent.setup();
		let engine: GameEngine | undefined;
		for (let seed = 1; seed < 100; seed += 1) {
			const candidate = new GameEngine({ mode: 'standard', seed });
			if (
				candidate
					.getSnapshot()
					.draft?.choices.some((id) =>
						[
							'frost',
							'pulse',
							'focus-core',
							'double-fork',
							'impact-trigger',
							'proximity-mine',
							'cinder-trail',
							'void-beam',
						].includes(id),
					)
			) {
				engine = candidate;
				break;
			}
		}
		if (!engine) {
			throw new Error('Expected a covered draft choice');
		}
		const before = engine.getSnapshot().draft;
		const openThought = vi.fn();
		render(
			<RewardDraft
				engine={engine}
				snapshot={engine.getSnapshot()}
				inventory={engine.getViewSnapshot().moduleInventory}
				onOpenThought={openThought}
			/>,
		);
		const panel = screen.getByRole('region', { name: en['reward.initialAria'] });
		expect(within(panel).getAllByRole('button', { name: en['reward.choose'] })).toHaveLength(4);
		await user.click(panel.querySelector('.reward-card') as HTMLElement);
		expect(engine.getSnapshot().draft).toEqual(before);
		await user.click(
			within(panel).getAllByRole('button', { name: en['thoughtIndex.viewThought'] })[0] as HTMLElement,
		);
		expect(openThought).toHaveBeenCalledOnce();
		expect(engine.getSnapshot().draft).toEqual(before);
	});

	it('links covered compiler diagnostics to their explanation', async () => {
		const user = userEvent.setup();
		const engine = new GameEngine({ mode: 'creative', seed: 7 });
		const openThought = vi.fn();
		render(
			<ProgramReadout
				program={engine.modules.compile(['impact-trigger', 'pulse'])}
				engine={engine}
				maxEnergy={100}
				onOpenThought={openThought}
			/>,
		);
		await user.click(screen.getByRole('button', { name: en['thoughtIndex.explainDiagnostic'] }));
		expect(openThought).toHaveBeenCalledWith('impact-trigger');
	});
});
