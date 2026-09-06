import { describe, expect, it } from 'vitest';
import type { GameViewSnapshot } from '@prism-bastion/game-core/game/types';
import { resolveTutorialStep, tutorialStepCompleted, WRONG_TOWER_STEP } from '@prism-bastion/web-single/tutorial/model';

const view = (overrides: Record<string, unknown> = {}): GameViewSnapshot =>
	({
		game: { wave: 0, status: 'planning' },
		selectedTower: null,
		...overrides,
	}) as GameViewSnapshot;

describe('tutorial guide model', () => {
	it('advances the waiting step only after a completed wave returns to planning', () => {
		const step = { id: 'wait-first-wave' };
		expect(tutorialStepCompleted(step, view(), 1)).toBe(false);
		expect(tutorialStepCompleted(step, view({ game: { wave: 1, status: 'wave' } }), 1)).toBe(false);
		expect(tutorialStepCompleted(step, view({ game: { wave: 1, status: 'planning' } }), 1)).toBe(true);
	});

	it('requires the tutorial tower and exposes the recovery step for a wrong selection', () => {
		const step = { id: 'ensure-tower', action: 'select-tower' } as const;
		expect(resolveTutorialStep(step, view({ selectedTower: { id: 2 } }), 1)).toBe(WRONG_TOWER_STEP);
		expect(tutorialStepCompleted(step, view({ selectedTower: { id: 1 } }), 1)).toBe(true);
	});

	it('checks both destination installation and source removal for move steps', () => {
		const step = {
			id: 'move',
			drag: { sourceSelector: '', targetSelector: '', moduleId: 'pulse', sourceSlot: 1, targetSlot: 2 },
		};
		expect(tutorialStepCompleted(step, view({ selectedTower: { slots: [null, 'pulse', 'pulse'] } }), 1)).toBe(
			false,
		);
		expect(tutorialStepCompleted(step, view({ selectedTower: { slots: [null, null, 'pulse'] } }), 1)).toBe(true);
	});
});
