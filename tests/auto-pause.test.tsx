// @vitest-environment jsdom

import { translate } from './helpers/translate';

import en from '../packages/web-shared/src/i18n/locales/en.json';
import { textPattern } from './helpers/text';

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@prism-bastion/web-shared/i18n';
import { GameEngine } from '@prism-bastion/game-core/game/engine';
import { App } from '@prism-bastion/web-single/App';
import { GameSession } from '@prism-bastion/web-single/GameSession';
import { SettingsPanel } from '@prism-bastion/web-shared/ui/SettingsPanel';
import { AUTO_PAUSE_STORAGE_KEY } from '@prism-bastion/web-shared/ui/preferences';

beforeEach(() => {
	const storedValues = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => storedValues.get(key) ?? null,
		setItem: (key: string, value: string) => storedValues.set(key, value),
		removeItem: (key: string) => storedValues.delete(key),
	});
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('automatic pause', () => {
	it('is enabled by default and persists when disabled in settings', async () => {
		const user = userEvent.setup();
		const { unmount } = render(<SettingsPanel />);
		await user.click(screen.getByRole('button', { name: en['settings.title'] }));

		const autoPauseGroup = screen.getByRole('group', { name: en['settings.autoPauseTitle'] });
		expect(
			within(autoPauseGroup)
				.getByRole('button', { name: en['settings.autoPauseEnabled'] })
				.getAttribute('aria-pressed'),
		).toBe('true');
		await user.click(within(autoPauseGroup).getByRole('button', { name: en['settings.autoPauseDisabled'] }));
		expect(globalThis.localStorage.getItem(AUTO_PAUSE_STORAGE_KEY)).toBe('0');

		unmount();
		render(<SettingsPanel />);
		await user.click(screen.getByRole('button', { name: en['settings.title'] }));
		const restoredGroup = screen.getByRole('group', { name: en['settings.autoPauseTitle'] });
		expect(
			within(restoredGroup)
				.getByRole('button', { name: en['settings.autoPauseDisabled'] })
				.getAttribute('aria-pressed'),
		).toBe('true');
	});

	it('pauses while the Arc Workshop is open and resumes when it closes', async () => {
		const user = userEvent.setup();
		const engine = new GameEngine({ mode: 'creative', seed: 9 });
		const tower = engine.towers[0];
		if (!tower) {
			throw new Error('Expected a tower');
		}
		engine.selectTower(tower.id);

		render(
			<GameSession
				engine={engine}
				defenseArchive={{} as never}
				onExit={() => undefined}
				onOpenArchive={() => undefined}
				onTutorialResolved={() => undefined}
			/>,
		);

		await waitFor(() => expect(engine.getSnapshot()).toMatchObject({ paused: true, manuallyPaused: false }));
		expect(screen.getByText(en['battlefield.autoPaused'])).toBeTruthy();
		await user.click(screen.getByRole('button', { name: en['header.pause'] }));
		expect(screen.getByText(en['battlefield.paused'])).toBeTruthy();
		await user.click(screen.getByRole('button', { name: en['header.resume'] }));
		expect(screen.getByText(en['battlefield.autoPaused'])).toBeTruthy();
		await user.click(screen.getByRole('button', { name: en['workshop.close'] }));
		await waitFor(() => expect(engine.getSnapshot().paused).toBe(false));
	});

	it('registers the signal compendium and lost tab focus as automatic conditions', async () => {
		const user = userEvent.setup();
		const conditionSpy = vi.spyOn(GameEngine.prototype, 'setAutoPauseCondition');
		render(<App />);
		await user.click(screen.getByRole('button', { name: en['tutorialOffer.decline'] }));
		await user.click(screen.getByRole('button', { name: textPattern(en['levelSelect.startAction']) }));

		window.dispatchEvent(new Event('blur'));
		expect(conditionSpy).toHaveBeenCalledWith('page-focus', true);

		await user.click(
			screen.getAllByRole('button', {
				name: translate('battlefield.openSignalArchive', { signal: en['signals.spark'] }),
			})[0] as HTMLElement,
		);
		expect(conditionSpy).toHaveBeenCalledWith('signal-archive', true);
		await user.click(screen.getByRole('button', { name: en['signalArchive.backToBattlefield'] }));
		expect(conditionSpy).toHaveBeenCalledWith('signal-archive', false);
	});
});
