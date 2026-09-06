import type { GameViewSnapshot } from '@prism-bastion/game-core/game/types';

export type TutorialAction = 'select-tower' | 'place-tower' | 'click-element';
export interface TutorialDrag {
	sourceSelector: string;
	targetSelector: string;
	moduleId: string;
	targetSlot: number;
	sourceSlot?: number;
}
export interface TutorialStep {
	id: string;
	selector?: string;
	action?: TutorialAction;
	drag?: TutorialDrag;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
	{ id: 'welcome' },
	{ id: 'tower', action: 'select-tower' },
	{
		id: 'frost-drag',
		drag: {
			sourceSelector: '[data-tutorial-module="frost"]',
			targetSelector: '[data-tutorial-slot="0"]',
			moduleId: 'frost',
			targetSlot: 0,
		},
	},
	{
		id: 'pulse-drag-first',
		drag: {
			sourceSelector: '[data-tutorial-module="pulse"]',
			targetSelector: '[data-tutorial-slot="1"]',
			moduleId: 'pulse',
			targetSlot: 1,
		},
	},
	{ id: 'first-program', selector: '[data-tutorial-program]' },
	{ id: 'close-first-workshop', selector: '[data-tutorial-workshop-close]', action: 'click-element' },
	{ id: 'build-second-tower', action: 'place-tower' },
	{
		id: 'second-pulse-drag',
		drag: {
			sourceSelector: '[data-tutorial-module="pulse"]',
			targetSelector: '[data-tutorial-slot="0"]',
			moduleId: 'pulse',
			targetSlot: 0,
		},
	},
	{ id: 'close-second-workshop', selector: '[data-tutorial-workshop-close]', action: 'click-element' },
	{ id: 'launch-one', selector: '[data-tutorial-launch]', action: 'click-element' },
	{ id: 'wait-first-wave' },
	{ id: 'ensure-tower', action: 'select-tower' },
	{
		id: 'move-pulse',
		drag: {
			sourceSelector: '[data-tutorial-slot="1"]',
			targetSelector: '[data-tutorial-slot="2"]',
			moduleId: 'pulse',
			sourceSlot: 1,
			targetSlot: 2,
		},
	},
	{
		id: 'trigger-drag',
		drag: {
			sourceSelector: '[data-tutorial-module="impact-trigger"]',
			targetSelector: '[data-tutorial-slot="1"]',
			moduleId: 'impact-trigger',
			targetSlot: 1,
		},
	},
	{
		id: 'static-drag',
		drag: {
			sourceSelector: '[data-tutorial-module="proximity-mine"]',
			targetSelector: '[data-tutorial-slot="3"]',
			moduleId: 'proximity-mine',
			targetSlot: 3,
		},
	},
	{ id: 'final-program', selector: '[data-tutorial-program]' },
	{ id: 'close-final-workshop', selector: '[data-tutorial-workshop-close]', action: 'click-element' },
	{ id: 'launch-two', selector: '[data-tutorial-launch]', action: 'click-element' },
] as const;

export const WRONG_TOWER_STEP: TutorialStep = {
	id: 'ensure-wrong-tower',
	selector: '[data-tutorial-workshop-close]',
	action: 'click-element',
};

export const resolveTutorialStep = (
	step: TutorialStep | undefined,
	view: GameViewSnapshot,
	tutorialTowerId: number | undefined,
): TutorialStep | undefined =>
	step?.id === 'ensure-tower' && view.selectedTower !== null && view.selectedTower.id !== tutorialTowerId
		? WRONG_TOWER_STEP
		: step;

export const tutorialStepCompleted = (
	step: TutorialStep | undefined,
	view: GameViewSnapshot,
	tutorialTowerId: number | undefined,
): boolean => {
	if (step?.id === 'wait-first-wave') {
		return view.game.wave >= 1 && view.game.status === 'planning';
	}
	if (step?.id === 'ensure-tower') {
		return view.selectedTower?.id === tutorialTowerId;
	}
	if (!step?.drag || view.selectedTower?.slots[step.drag.targetSlot] !== step.drag.moduleId) {
		return false;
	}
	return step.drag.sourceSlot === undefined || view.selectedTower.slots[step.drag.sourceSlot] === null;
};
