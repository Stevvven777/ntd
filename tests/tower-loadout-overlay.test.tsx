// @vitest-environment jsdom

import en from '../packages/web-shared/src/i18n/locales/en.json';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '@prism-bastion/web-shared/i18n';
import { CoopGameController } from '@prism-bastion/coop/controller';
import { WORLD } from '@prism-bastion/game-core/game/config';
import { TowerLoadoutOverlay, worldPointToBattlefieldOverlay } from '../apps/web-coop/src/TowerLoadoutOverlay';

afterEach(() => cleanup());

describe('tower loadout overlay', () => {
	it('keeps installed modules in slot order and omits empty slots', () => {
		const engine = new CoopGameController({ levelId: 'starter-elbow', difficultyId: 'normal', seed: 7 }).engine;
		const tower = engine.towers[0];
		if (!tower) {
			throw new Error('Expected a starting tower');
		}
		tower.slots = ['frost', null, 'pulse', null];

		render(<TowerLoadoutOverlay engine={engine} towers={[tower]} />);

		const loadout = screen.getByRole('group', { name: en['thoughtIndex.installedModules'] });
		expect(
			[...loadout.querySelectorAll('[data-module-id]')].map((element) => [
				element.getAttribute('data-module-id'),
				element.getAttribute('data-slot-index'),
			]),
		).toEqual([
			['frost', '0'],
			['pulse', '2'],
		]);
		expect(screen.getByRole('img', { name: en['modules.frost.name'] })).not.toBeNull();
		expect(screen.getByRole('img', { name: en['modules.pulse.name'] })).not.toBeNull();
	});

	it('matches the canvas world transform when the viewport is letterboxed', () => {
		expect(
			worldPointToBattlefieldOverlay(
				{ width: WORLD.width, height: WORLD.height + 200 },
				{ x: WORLD.width / 2, y: WORLD.height / 2 },
			),
		).toEqual({ x: WORLD.width / 2, y: WORLD.height / 2 + 100 });
	});
});
