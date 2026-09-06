import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { GameViewSnapshot } from '@prism-bastion/game-core/game/types';
import { resolveTutorialStep, tutorialStepCompleted, TUTORIAL_STEPS, type TutorialStep } from './tutorial/model';
import { useDraggablePanel } from './tutorial/useDraggablePanel';
import { spotlightStyle, useTutorialTargets } from './tutorial/useTutorialTargets';
import styles from './TutorialGuide.module.css';

type StepField = 'eyebrow' | 'title' | 'body' | 'instruction' | 'continue';

const activateTutorialTarget = (step: TutorialStep, engine: GameEngine): void => {
	switch (step.action) {
		case 'select-tower': {
			const tower = engine.towers[0];
			if (tower) {
				engine.selectTower(tower.id);
			}
			return;
		}
		case 'place-tower':
			engine.placeTower(1);
			return;
		case 'click-element':
			if (step.selector) {
				document.querySelector<HTMLElement>(step.selector)?.click();
			}
			return;
		default:
			return;
	}
};

const tutorialIsActive = (
	tutorialEnabled: boolean,
	dismissed: boolean,
	step: TutorialStep | undefined,
): step is TutorialStep => tutorialEnabled && !dismissed && step !== undefined;

export function TutorialGuide({
	engine,
	view,
	onResolved,
}: {
	engine: GameEngine;
	view: GameViewSnapshot;
	onResolved: () => void;
}) {
	const { t, i18n } = useTranslation();
	const [stepIndex, setStepIndex] = useState(0);
	const [dismissed, setDismissed] = useState(false);
	const primaryRef = useRef<HTMLButtonElement>(null);
	const panel = useDraggablePanel();
	const rawStep = TUTORIAL_STEPS[stepIndex];
	const tutorialTowerId = engine.towers[0]?.id;
	const step = resolveTutorialStep(rawStep, view, tutorialTowerId);
	const active = tutorialIsActive(engine.tutorialEnabled, dismissed, step);
	const { target, secondaryTarget } = useTutorialTargets(step, engine, active, view.revision);
	const stepKey = (field: StepField): string => `tutorial.steps.${step?.id}.${field}`;
	const stepText = (field: StepField): string => t(stepKey(field));
	const hasStepText = (field: 'instruction' | 'continue'): boolean => i18n.exists(stepKey(field));

	useEffect(() => {
		if (tutorialStepCompleted(rawStep, view, tutorialTowerId)) {
			setStepIndex((index) => index + 1);
		}
	}, [rawStep, tutorialTowerId, view]);
	useEffect(() => primaryRef.current?.focus(), [stepIndex, target]);

	if (!active || !step) {
		return null;
	}
	const advance = (): void => {
		if (step.id === 'welcome') {
			panel.reset();
		}
		if (stepIndex === TUTORIAL_STEPS.length - 1) {
			onResolved();
		}
		setStepIndex((index) => index + 1);
	};
	const skip = (): void => {
		onResolved();
		setDismissed(true);
	};
	const activateTarget = (): void => {
		activateTutorialTarget(step, engine);
		if (step.id !== 'ensure-wrong-tower') {
			advance();
		}
	};
	const instruction = hasStepText('instruction') ? stepText('instruction') : undefined;
	const targetCss = spotlightStyle(target);
	return (
		<div className={styles['tutorial-layer']} role="region" aria-label={t('tutorial.aria')}>
			{target ? (
				<>
					<div
						className={`${styles['tutorial-spotlight']} ${step.drag ? styles['drag-source'] : ''}`}
						data-tutorial-spotlight={step.drag ? 'source' : 'target'}
						data-label={step.drag ? t('tutorial.dragSource') : undefined}
						style={targetCss}
					/>
					{step.action ? (
						<button
							ref={primaryRef}
							className={styles['tutorial-hit-target']}
							style={targetCss}
							onClick={activateTarget}
							aria-label={instruction ?? stepText('title')}
						/>
					) : null}
				</>
			) : null}
			{secondaryTarget ? (
				<div
					className={`${styles['tutorial-spotlight']} ${styles['drag-destination']}`}
					data-tutorial-spotlight="destination"
					data-label={t('tutorial.dragDestination')}
					style={spotlightStyle(secondaryTarget)}
				/>
			) : null}
			<section
				ref={panel.panelRef}
				data-tutorial-panel
				className={`${styles['tutorial-card']} ${step.id === 'welcome' ? styles['tutorial-card-welcome'] : ''}`}
				style={panel.style}
				aria-live={step.id === 'wait-first-wave' ? 'polite' : undefined}
			>
				<div className={styles['tutorial-card-head']}>
					<span>{stepText('eyebrow')}</span>
					<button
						className={styles['tutorial-drag-handle']}
						aria-label={t('tutorial.dragAria')}
						title={t('tutorial.dragTitle')}
						{...panel.handleProps}
					>
						⠿
					</button>
					<button className={styles['tutorial-skip']} onClick={skip}>
						{t('tutorial.skip')}
					</button>
				</div>
				<h2>{stepText('title')}</h2>
				<p>{stepText('body')}</p>
				{instruction ? (
					<div className={styles['tutorial-instruction']}>
						<i />
						{instruction}
					</div>
				) : null}
				{step.id !== 'wait-first-wave' && !step.action && !step.drag ? (
					<button ref={primaryRef} className={styles['tutorial-continue']} onClick={advance}>
						{hasStepText('continue') ? stepText('continue') : t('common.continue')}
					</button>
				) : null}
				<div
					className={styles['tutorial-progress']}
					aria-label={t('tutorial.progress', { current: stepIndex + 1, total: TUTORIAL_STEPS.length })}
				>
					{TUTORIAL_STEPS.map((item, index) => (
						<i key={item.id} className={index <= stepIndex ? styles.active : undefined} />
					))}
				</div>
			</section>
		</div>
	);
}
