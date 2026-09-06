import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { moduleShortName } from '../../i18n/presentation';
import { modulePresentationRegistry } from '../../module-presentations';
import type { ThoughtSceneDirector } from '../../thoughts';
import type { ThoughtPlayerSnapshot } from '../../thoughts/types';
import { moduleUiColor, moduleUiTint } from '../modulePresentation';
import styles from '../ThoughtFlowOverlay.module.css';
import { fitLoadoutModule } from './dom';
import type { OverlayPosition } from './geometry';

export function ThoughtLoadouts({
	director,
	snapshot,
	dialogPositions,
	compactPositions,
	registerDialog,
	registerCompact,
}: {
	director: ThoughtSceneDirector;
	snapshot: ThoughtPlayerSnapshot;
	dialogPositions: Record<number, OverlayPosition>;
	compactPositions: Record<number, OverlayPosition>;
	registerDialog: (towerIndex: number, element: HTMLDivElement | null) => void;
	registerCompact: (towerIndex: number, element: HTMLDivElement | null) => void;
}) {
	const { t } = useTranslation();
	const slotEntriesFor = (towerIndex: number) =>
		director.runtime.engine.towers[towerIndex]?.slots.flatMap((moduleId, index) =>
			moduleId ? [{ module: director.runtime.engine.modules.require(moduleId), index }] : [],
		) ?? [];
	const visibleSlotsFor = (towerIndex: number) => {
		const entries = slotEntriesFor(towerIndex);
		return snapshot.loadoutVisibleRange
			? entries.slice(
					snapshot.loadoutVisibleRange.start,
					snapshot.loadoutVisibleRange.start + snapshot.loadoutVisibleRange.count,
				)
			: entries.slice(0, snapshot.loadoutVisibleSlots ?? entries.length);
	};
	const dialogVisible = snapshot.loadoutMode === 'dialog' || snapshot.loadoutMode === 'dialog-leaving';
	const compactVisible = snapshot.loadoutMode === 'compact' || snapshot.loadoutMode === 'compact-leaving';
	return (
		<>
			{dialogVisible
				? snapshot.loadoutTargets.map((target) => (
						<div
							ref={(element) => registerDialog(target.towerIndex, element)}
							className={`${styles['thought-loadout-dialog']} ${snapshot.loadoutMode === 'dialog-leaving' ? styles.leaving : ''}`}
							data-thought-loadout-dialog
							data-placement={target.placement}
							data-thought-tower={target.towerIndex}
							style={dialogPositions[target.towerIndex]}
							aria-label={t('thoughtIndex.installedModules')}
							key={`loadout-${target.towerIndex}`}
						>
							{visibleSlotsFor(target.towerIndex).map(({ module, index }) => {
								const Icon = modulePresentationRegistry.require(module.id).icon;
								const replacement = snapshot.loadoutReplacements.find(
									(candidate) =>
										candidate.towerIndex === target.towerIndex && candidate.slot === index,
								);
								const addition = snapshot.loadoutAdditions.some(
									(candidate) =>
										candidate.towerIndex === target.towerIndex && candidate.slot === index,
								);
								const previousModule = replacement
									? director.runtime.engine.modules.require(replacement.from)
									: null;
								const PreviousIcon = previousModule
									? modulePresentationRegistry.require(previousModule.id).icon
									: undefined;
								return (
									<div
										ref={(element) =>
											fitLoadoutModule(element, `.${styles['thought-loadout-module']!}`)
										}
										data-thought-slot={index}
										data-thought-loadout-reveal
										className={`${styles['thought-loadout-module-reveal']} ${addition ? styles.adding : ''} ${replacement ? styles.replacing : ''}`}
										key={`loadout-slot-${index}`}
									>
										{previousModule && PreviousIcon ? (
											<div
												className={`${styles['thought-loadout-module']} ${styles['thought-loadout-module--outgoing']}`}
												style={
													{
														'--chip-color': moduleUiColor(previousModule),
														'--chip-tint': moduleUiTint(previousModule),
													} as CSSProperties
												}
												aria-hidden="true"
											>
												<span data-thought-module-icon>
													<PreviousIcon />
												</span>
												<strong>{moduleShortName(t, previousModule.id)}</strong>
											</div>
										) : null}
										<div
											className={`${styles['thought-loadout-module']} ${snapshot.highlightSlots.includes(index) ? styles.active : ''} ${replacement ? styles['thought-loadout-module--incoming'] : ''}`}
											data-thought-loadout-module
											data-transition={replacement ? 'incoming' : undefined}
											style={
												{
													'--chip-color': moduleUiColor(module),
													'--chip-tint': moduleUiTint(module),
												} as CSSProperties
											}
										>
											<span data-thought-module-icon>
												<Icon />
											</span>
											<strong>{moduleShortName(t, module.id)}</strong>
										</div>
									</div>
								);
							})}
						</div>
					))
				: null}
			{compactVisible
				? snapshot.loadoutTargets.map((target) => (
						<div
							ref={(element) => registerCompact(target.towerIndex, element)}
							className={`${styles['thought-compact-loadout']} ${snapshot.loadoutMode === 'compact-leaving' ? styles.leaving : ''}`}
							data-thought-tower={target.towerIndex}
							style={compactPositions[target.towerIndex]}
							aria-label={t('thoughtIndex.installedModules')}
							key={`compact-loadout-${target.towerIndex}`}
						>
							{slotEntriesFor(target.towerIndex).map(({ module, index }) => {
								const Icon = modulePresentationRegistry.require(module.id).icon;
								return (
									<span
										key={`${module.id}-${index}`}
										data-thought-slot={index}
										className={snapshot.highlightSlots.includes(index) ? styles.active : undefined}
										style={{ '--chip-color': moduleUiColor(module) } as CSSProperties}
									>
										<Icon />
									</span>
								);
							})}
						</div>
					))
				: null}
		</>
	);
}
