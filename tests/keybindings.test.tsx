// @vitest-environment jsdom

import { translate } from './helpers/translate';

import en from '../packages/web-shared/src/i18n/locales/en.json';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import '@prism-bastion/web-shared/i18n';
import { SettingsPanel } from '@prism-bastion/web-shared/ui/SettingsPanel';
import { GameHeader } from '@prism-bastion/web-shared/ui/GameHeader';
import { GameEngine } from '@prism-bastion/game-core/game/engine';
import {
	defaultKeybindings,
	getKeybindings,
	KEYBINDINGS_STORAGE_KEY,
	parseKeybindings,
	saveKeybindings,
} from '@prism-bastion/web-shared/ui/keybindings';

beforeEach(() => {
	const values = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
	});
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it('migrates index arrow bindings to step keys that leave page navigation available', () => {
	const bindings = parseKeybindings(
		JSON.stringify({ thoughtPrevious: 'ArrowLeft', thoughtNext: 'ArrowRight', pause: 'ArrowRight' }),
	);
	expect(bindings.thoughtPrevious).toBe('PageUp');
	expect(bindings.thoughtNext).toBe('PageDown');
	expect(bindings.pause).toBe('ArrowRight');
});

it('records combinations, rejects conflicts, cancels without closing, clears and restores', async () => {
	const user = userEvent.setup();
	const { unmount } = render(<SettingsPanel />);
	await user.click(screen.getByRole('button', { name: en['settings.title'] }));
	await user.click(screen.getByRole('tab', { name: en['settings.categories.controls'] }));
	await user.click(screen.getByRole('button', { name: en['settings.keys.pause'], exact: true }));
	fireEvent.keyDown(window, { key: 'n' });
	expect(screen.getByText(translate('settings.keys.conflict', { action: en['settings.keys.launch'] }))).toBeTruthy();
	fireEvent.keyDown(window, { key: 'p', ctrlKey: true, shiftKey: true });
	expect(getKeybindings().pause).toBe('Ctrl+Shift+P');
	expect(JSON.parse(localStorage.getItem(KEYBINDINGS_STORAGE_KEY)!)).toMatchObject({ pause: 'Ctrl+Shift+P' });
	await user.click(screen.getByRole('button', { name: en['settings.keys.pause'], exact: true }));
	fireEvent.keyDown(window, { key: 'Escape' });
	expect(screen.getByRole('dialog')).toBeTruthy();
	expect(getKeybindings().pause).toBe('Ctrl+Shift+P');
	unmount();
	render(<SettingsPanel />);
	await user.click(screen.getByRole('button', { name: en['settings.title'] }));
	await user.click(screen.getByRole('tab', { name: en['settings.categories.controls'] }));
	expect(screen.getByRole('button', { name: en['settings.keys.pause'], exact: true }).textContent).toBe(
		'Ctrl+Shift+P',
	);
	await user.click(
		screen.getByRole('button', { name: translate('settings.keys.clear', { action: en['settings.keys.pause'] }) }),
	);
	expect(getKeybindings().pause).toBeNull();
	await user.click(screen.getByRole('button', { name: en['settings.keys.reset'] }));
	expect(getKeybindings()).toEqual(defaultKeybindings);
});

it('uses rebound gameplay keys and ignores old keys, repeats, inputs and settings', async () => {
	saveKeybindings({ ...defaultKeybindings, pause: 'P' });
	const engine = new GameEngine({ mode: 'creative', seed: 9 });
	const toggle = vi.spyOn(engine, 'togglePause');
	render(<GameHeader engine={engine} snapshot={engine.getSnapshot()} onExit={() => undefined} />);
	fireEvent.keyDown(window, { key: ' ' });
	fireEvent.keyDown(window, { key: 'p', repeat: true });
	expect(toggle).not.toHaveBeenCalled();
	fireEvent.keyDown(window, { key: 'p' });
	expect(toggle).toHaveBeenCalledTimes(1);
	const input = document.createElement('input');
	document.body.append(input);
	fireEvent.keyDown(input, { key: 'p' });
	input.remove();
	await userEvent.click(screen.getByRole('button', { name: en['settings.title'] }));
	fireEvent.keyDown(window, { key: 'p' });
	expect(toggle).toHaveBeenCalledTimes(1);
});

it('respects disabled launching and externally controlled pause and speed', () => {
	const engine = new GameEngine({ mode: 'creative', seed: 9 });
	vi.spyOn(engine, 'externallyControlled', 'get').mockReturnValue(true);
	const launch = vi.fn();
	const pause = vi.spyOn(engine, 'togglePause');
	const speed = vi.spyOn(engine, 'setSpeed');
	const { rerender } = render(
		<GameHeader
			engine={engine}
			snapshot={engine.getSnapshot()}
			onExit={() => undefined}
			onLaunch={launch}
			launchDisabled
		/>,
	);
	for (const key of [' ', 'g', 'n']) {
		fireEvent.keyDown(window, { key });
	}
	expect(launch).not.toHaveBeenCalled();
	expect(pause).not.toHaveBeenCalled();
	expect(speed).not.toHaveBeenCalled();
	rerender(
		<GameHeader
			engine={engine}
			snapshot={engine.getSnapshot()}
			onExit={() => undefined}
			onLaunch={launch}
			launchDisabled={false}
		/>,
	);
	fireEvent.keyDown(window, { key: 'n' });
	expect(launch).toHaveBeenCalledTimes(1);
});

it('recovers from malformed storage and rejects conflicting persisted bindings', () => {
	expect(parseKeybindings('{broken')).toEqual(defaultKeybindings);
	expect(parseKeybindings(JSON.stringify({ pause: 'Escape' }))).toEqual(defaultKeybindings);
	expect(parseKeybindings(JSON.stringify({ pause: 'N' }))).toEqual(defaultKeybindings);
	expect(parseKeybindings(JSON.stringify({ pause: null }))).toMatchObject({ pause: null });
});

it('switches icon tabs with keyboard navigation and cancels recording when leaving controls', async () => {
	const user = userEvent.setup();
	render(<SettingsPanel />);
	await user.click(screen.getByRole('button', { name: en['settings.title'] }));
	const general = screen.getByRole('tab', { name: en['settings.categories.general'] });
	expect(document.activeElement).toBe(general);
	await user.keyboard('{ArrowLeft}');
	expect(document.activeElement).toBe(general);
	expect(screen.queryByRole('button', { name: en['settings.keys.pause'], exact: true })).toBeNull();
	await user.keyboard('{ArrowRight}');
	expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(
		screen.getByRole('tab', { name: en['settings.categories.controls'] }).id,
	);
	await user.click(screen.getByRole('button', { name: en['settings.keys.pause'], exact: true }));
	await user.click(screen.getByRole('tab', { name: en['settings.categories.storage'] }));
	fireEvent.keyDown(window, { key: 'p' });
	expect(getKeybindings().pause).toBe('Space');
	expect(screen.getByRole('button', { name: en['defenseArchive.clear'] })).toBeTruthy();
	await user.keyboard('{End}');
	const lastTab = document.activeElement;
	await user.keyboard('{ArrowRight}');
	expect(document.activeElement).toBe(lastTab);
	await user.keyboard('{Home}');
	expect(document.activeElement).toBe(general);
	expect(screen.queryByRole('button', { name: en['defenseArchive.clear'] })).toBeNull();
});

it('navigates categories from content controls and scrolls with vertical arrows', async () => {
	const user = userEvent.setup();
	render(<SettingsPanel />);
	await user.click(screen.getByRole('button', { name: en['settings.title'] }));
	await user.click(screen.getByRole('tab', { name: en['settings.categories.controls'] }));
	const content = screen.getByRole('tabpanel');
	const reset = screen.getByRole('button', { name: en['settings.keys.reset'] });
	reset.focus();
	fireEvent.keyDown(reset, { key: 'ArrowDown' });
	expect(content.scrollTop).toBe(72);
	fireEvent.keyDown(reset, { key: 'ArrowUp' });
	expect(content.scrollTop).toBe(0);
	fireEvent.keyDown(reset, { key: 'ArrowRight' });
	expect(screen.getByRole('tab', { name: en['settings.categories.storage'] }).getAttribute('aria-selected')).toBe(
		'true',
	);
	expect(Object.values(defaultKeybindings).some((key) => /^F\d+$/.test(key))).toBe(false);
});

it('captures arrow bindings without switching categories or scrolling', async () => {
	const user = userEvent.setup();
	render(<SettingsPanel />);
	await user.click(screen.getByRole('button', { name: en['settings.title'] }));
	await user.click(screen.getByRole('tab', { name: en['settings.categories.controls'] }));
	const pause = screen.getByRole('button', { name: en['settings.keys.pause'], exact: true });
	await user.click(pause);
	fireEvent.keyDown(pause, { key: 'ArrowRight' });
	expect(getKeybindings().pause).toBe('ArrowRight');
	expect(screen.getByRole('tab', { name: en['settings.categories.controls'] }).getAttribute('aria-selected')).toBe(
		'true',
	);
	await user.click(pause);
	fireEvent.keyDown(pause, { key: 'ArrowDown' });
	expect(getKeybindings().pause).toBe('ArrowDown');
	expect(screen.getByRole('tabpanel').scrollTop).toBe(0);
});
