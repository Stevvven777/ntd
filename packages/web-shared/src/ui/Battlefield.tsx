import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { WORLD } from '@prism-bastion/game-core/game/config';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { SignalId, GameSnapshot, GameViewSnapshot } from '@prism-bastion/game-core/game/types';
import { difficultyName, levelName } from '../i18n/presentation';
import { GameCanvas } from './GameCanvas';
import { SignalPreview } from './SignalPreview';
import { CreativeLab } from './CreativeLab';
import { Tag } from './Tag';
import styles from './Battlefield.module.css';

export interface BattlefieldUtilityPanel {
	id: string;
	label: string;
	render: (onClose: () => void) => ReactNode;
}

const battlefieldPhase = (t: TFunction, snapshot: GameSnapshot): string => {
	if (snapshot.status === 'won') {
		return t('battlefield.won');
	}
	if (snapshot.status === 'lost') {
		return t('battlefield.lost');
	}
	if (snapshot.manuallyPaused) {
		return t('battlefield.paused');
	}
	if (snapshot.paused) {
		return t('battlefield.autoPaused');
	}
	if (snapshot.status === 'wave') {
		return t('battlefield.contact');
	}
	return snapshot.status === 'reward' ? t('battlefield.intercepting') : t('battlefield.planning');
};

const incomingWaveLabel = (terminal: boolean, waveInProgress: boolean): string => {
	if (terminal) {
		return 'battlefield.noSignals';
	}
	return waveInProgress ? 'battlefield.currentWave' : 'battlefield.nextWave';
};

interface BattlefieldHeaderProps {
	engine: GameEngine;
	snapshot: GameSnapshot;
	runIndicator: string;
	terminal: boolean;
	waveInProgress: boolean;
	previewWave: number;
	onOpenArchive: (type: SignalId) => void;
	utilityPanel?: BattlefieldUtilityPanel | undefined;
	creativePanelOpen: boolean;
	utilityPanelOpen: boolean;
	creativeToggleRef: RefObject<HTMLButtonElement | null>;
	utilityToggleRef: RefObject<HTMLButtonElement | null>;
	setCreativePanelOpen: Dispatch<SetStateAction<boolean>>;
	setUtilityPanelOpen: Dispatch<SetStateAction<boolean>>;
}

function BattlefieldHeader(props: BattlefieldHeaderProps) {
	const { t } = useTranslation();
	const incomingLabel = incomingWaveLabel(props.terminal, props.waveInProgress);
	return (
		<div className={styles.header}>
			<div>
				<h1>
					{levelName(t, props.engine.level.id)}{' '}
					<Tag className={styles.sectorTag} tone="purple" borderless monospace>
						{props.engine.level.sector.replace('SECTOR ', '')}
					</Tag>
					<span className={styles.runIndicator}>· {props.runIndicator}</span>
				</h1>
			</div>
			<div className={styles.incoming}>
				<div className={styles.incomingTitle}>
					<small>{t(incomingLabel)}</small>
					{props.engine.rules.scenarioControls === 'creative' ? (
						<button
							ref={props.creativeToggleRef}
							className={styles.creativeSignalToggle}
							aria-haspopup="dialog"
							aria-expanded={props.creativePanelOpen}
							aria-controls="creative-signal-panel"
							onClick={() => {
								props.setUtilityPanelOpen(false);
								props.setCreativePanelOpen((open) => !open);
							}}
						>
							{t('battlefield.signalConsole')}
						</button>
					) : null}
					{props.utilityPanel ? (
						<button
							ref={props.utilityToggleRef}
							className={`${styles.creativeSignalToggle} ${styles.utilityToggle}`}
							aria-haspopup="dialog"
							aria-expanded={props.utilityPanelOpen}
							aria-controls={props.utilityPanel.id}
							onClick={() => {
								props.setCreativePanelOpen(false);
								props.setUtilityPanelOpen((open) => !open);
							}}
						>
							{props.utilityPanel.label}
						</button>
					) : null}
				</div>
				{props.terminal ? null : (
					<SignalPreview
						className={styles.signalPreview!}
						engine={props.engine}
						wave={props.previewWave}
						{...(props.waveInProgress ? { liveCounts: props.snapshot.waveSignalCounts } : {})}
						onOpenArchive={props.onOpenArchive}
					/>
				)}
			</div>
		</div>
	);
}

function BattlefieldCanvas({
	engine,
	backgroundEngine,
	suspended,
	snapshot,
	children,
}: {
	engine: GameEngine;
	backgroundEngine?: GameEngine | undefined;
	suspended: boolean;
	snapshot: GameSnapshot;
	children?: ReactNode;
}) {
	const { t } = useTranslation();
	const terminal = snapshot.status === 'won' || snapshot.status === 'lost';
	const spawns = engine.level.graph.entrances.map(
		(entrance) => engine.routeFor(entrance).pointAtDistance(44).position,
	);
	const core = engine.getCorePosition();
	return (
		<div className={styles.canvasWrap}>
			<GameCanvas engine={engine} backgroundEngine={backgroundEngine} suspended={suspended} />
			{spawns.map((spawn, index) => (
				<div
					className={styles.spawnLabel}
					data-battlefield-spawn
					key={engine.level.graph.entrances[index]}
					style={{ top: `${(spawn.y / WORLD.height) * 100}%` }}
				>
					<i />
					<span>{t('battlefield.spawn')}</span>
				</div>
			))}
			<div className={styles.coreLabel} style={{ top: `${(core.y / WORLD.height) * 100}%`, bottom: 'auto' }}>
				<span>{t('battlefield.core')}</span>
				<i />
			</div>
			{terminal ? (
				<div className={styles.statusOverlay} data-tone={snapshot.status}>
					<div className={styles.statusShape}>✦</div>
					<h2>{snapshot.status === 'won' ? t('battlefield.won') : t('battlefield.lost')}</h2>
					<p>
						{snapshot.status === 'won'
							? t('battlefield.wonDetail', {
									score: snapshot.score,
									core: snapshot.core,
									maxCore: snapshot.maxCore,
								})
							: t('battlefield.lostDetail', { wave: snapshot.wave })}
					</p>
					<button onClick={() => engine.reset()}>{t('battlefield.recalibrate')}</button>
				</div>
			) : null}
			{children}
		</div>
	);
}

function BattlefieldFooter({ engine, snapshot, phase }: { engine: GameEngine; snapshot: GameSnapshot; phase: string }) {
	const { t } = useTranslation();
	return (
		<footer className={styles.footer}>
			<div className={styles.footerState} data-battlefield-state>
				<i
					className={styles.liveDot}
					data-battlefield-live
					data-combat={(snapshot.status === 'wave' && !snapshot.paused) || undefined}
				/>
				<span>{phase}</span>
			</div>
			<div className={styles.scoreLine}>
				<Tag className={styles.modeChip} tone="yellow" borderless>
					{t(`modes.${snapshot.mode}`)}
				</Tag>
				{engine.difficulty.id === 'normal' ? null : (
					<Tag className={styles.difficultyChip} tone="purple" borderless>
						{difficultyName(t, engine.difficulty.id)}
					</Tag>
				)}
				{t('battlefield.score')} <strong>{String(snapshot.score).padStart(5, '0')}</strong>
			</div>
		</footer>
	);
}

export function Battlefield({
	className,
	engine,
	backgroundEngine,
	view,
	suspended = false,
	onOpenArchive,
	utilityPanel,
	workshop,
	children,
}: {
	className?: string;
	engine: GameEngine;
	backgroundEngine?: GameEngine | undefined;
	view: GameViewSnapshot;
	suspended?: boolean;
	onOpenArchive: (type: SignalId) => void;
	utilityPanel?: BattlefieldUtilityPanel;
	workshop?: ReactNode;
	children?: ReactNode;
}) {
	const { t } = useTranslation();
	const [creativePanelOpen, setCreativePanelOpen] = useState(false);
	const [utilityPanelOpen, setUtilityPanelOpen] = useState(false);
	const creativeToggleRef = useRef<HTMLButtonElement>(null);
	const creativePanelRef = useRef<HTMLDivElement>(null);
	const utilityToggleRef = useRef<HTMLButtonElement>(null);
	const utilityPanelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!creativePanelOpen && !utilityPanelOpen) {
			return;
		}
		const closeOnOutsidePointer = (event: PointerEvent): void => {
			const target = event.target;
			if (!(target instanceof Node)) {
				return;
			}
			if (
				creativePanelRef.current?.contains(target) ||
				creativeToggleRef.current?.contains(target) ||
				utilityPanelRef.current?.contains(target) ||
				utilityToggleRef.current?.contains(target)
			) {
				return;
			}
			setCreativePanelOpen(false);
			setUtilityPanelOpen(false);
		};
		document.addEventListener('pointerdown', closeOnOutsidePointer, true);
		return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
	}, [creativePanelOpen, utilityPanelOpen]);
	const { game: snapshot } = view;
	const phase = battlefieldPhase(t, snapshot);
	const terminal = snapshot.status === 'won' || snapshot.status === 'lost';
	const runIndicator =
		snapshot.mode === 'creative' ? t('battlefield.creativeIndicator') : difficultyName(t, engine.difficulty.id);
	const waveInProgress = snapshot.status === 'wave';
	const previewWave = waveInProgress ? Math.max(0, snapshot.wave - 1) : snapshot.wave;
	return (
		<section
			className={[styles.root, className].filter(Boolean).join(' ')}
			data-phase={snapshot.status}
			data-control={engine.externallyControlled ? 'external' : 'local'}
			aria-label={t('battlefield.aria')}
		>
			<div className={styles.stage}>
				<BattlefieldHeader
					{...{
						engine,
						snapshot,
						runIndicator,
						terminal,
						waveInProgress,
						previewWave,
						onOpenArchive,
						utilityPanel,
						creativePanelOpen,
						utilityPanelOpen,
						creativeToggleRef,
						utilityToggleRef,
						setCreativePanelOpen,
						setUtilityPanelOpen,
					}}
				/>

				{engine.rules.scenarioControls === 'creative' && creativePanelOpen ? (
					<div ref={creativePanelRef} id="creative-signal-panel" className={styles.creativeSignalPanel}>
						<CreativeLab
							engine={engine}
							setup={view.creativeSetup}
							onClose={() => {
								setCreativePanelOpen(false);
								creativeToggleRef.current?.focus();
							}}
						/>
					</div>
				) : null}
				{utilityPanel && utilityPanelOpen ? (
					<div ref={utilityPanelRef} id={utilityPanel.id} className={styles.creativeSignalPanel}>
						{utilityPanel.render(() => {
							setUtilityPanelOpen(false);
							utilityToggleRef.current?.focus();
						})}
					</div>
				) : null}

				<BattlefieldCanvas {...{ engine, backgroundEngine, suspended, snapshot, children }} />

				{workshop}
			</div>

			<BattlefieldFooter {...{ engine, snapshot, phase }} />
		</section>
	);
}
