import { useLayoutEffect, useState, type CSSProperties } from 'react';
import { WORLD } from '@prism-bastion/game-core/game/config';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { TutorialStep } from './model';

export interface TargetBox {
	top: number;
	left: number;
	width: number;
	height: number;
}
const elementBox = (element: Element): TargetBox => {
	const rect = element.getBoundingClientRect();
	return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
};
export const spotlightStyle = (target: TargetBox | null): CSSProperties | undefined =>
	target
		? {
				top: target.top - 7,
				left: target.left - 7,
				width: target.width + 14,
				height: target.height + 14,
			}
		: undefined;

export function useTutorialTargets(
	step: TutorialStep | undefined,
	engine: GameEngine,
	active: boolean,
	revision: number,
) {
	const [target, setTarget] = useState<TargetBox | null>(null);
	const [secondaryTarget, setSecondaryTarget] = useState<TargetBox | null>(null);
	useLayoutEffect(() => {
		if (!active || !step || step.id === 'welcome' || step.id === 'wait-first-wave') {
			setTarget(null);
			setSecondaryTarget(null);
			return;
		}
		const update = (): void => {
			if (step.drag) {
				const source = document.querySelector(step.drag.sourceSelector);
				const destination = document.querySelector(step.drag.targetSelector);
				setTarget(source ? elementBox(source) : null);
				setSecondaryTarget(destination ? elementBox(destination) : null);
				return;
			}
			setSecondaryTarget(null);
			if (step.action === 'select-tower' || step.action === 'place-tower') {
				const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
				const worldTarget =
					step.action === 'select-tower' ? engine.towers[0]?.position : engine.level.towerPads[1];
				if (!canvas || !worldTarget) {
					setTarget(null);
					return;
				}
				const bounds = canvas.getBoundingClientRect();
				const scale = Math.min(bounds.width / WORLD.width, bounds.height / WORLD.height);
				const size = Math.max(58, 76 * scale);
				setTarget({
					left: bounds.left + (bounds.width - WORLD.width * scale) / 2 + worldTarget.x * scale - size / 2,
					top: bounds.top + (bounds.height - WORLD.height * scale) / 2 + worldTarget.y * scale - size / 2,
					width: size,
					height: size,
				});
				return;
			}
			const element = step.selector ? document.querySelector(step.selector) : null;
			setTarget(element ? elementBox(element) : null);
		};
		update();
		const resizeObserver = new ResizeObserver(update);
		resizeObserver.observe(document.documentElement);
		const mutationObserver = new MutationObserver(update);
		mutationObserver.observe(document.body, { childList: true, subtree: true });
		window.addEventListener('resize', update);
		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			window.removeEventListener('resize', update);
		};
	}, [active, engine, revision, step]);
	return { target, secondaryTarget };
}
