import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SIGNAL_IDS, signalRegistry } from '@prism-bastion/game-core/signals';
import { levelDescription, levelName } from '@prism-bastion/web-shared/i18n/presentation';
import { LevelMap } from '@prism-bastion/web-shared/ui/LevelMap';
import { MobileFullscreenButton } from '@prism-bastion/web-shared/ui/MobileFullscreenButton';
import { Tag } from '@prism-bastion/web-shared/ui/Tag';
import { UiIcon } from '@prism-bastion/web-shared/ui/UiIcon';
import type { LevelSelectionController } from './useLevelSelection';
import styles from '../LevelSelect.module.css';

export function LevelCarousel({
	selection,
	homeActions,
	onOpenArchive,
	onOpenDefenseArchive,
	onOpenThought,
}: {
	selection: LevelSelectionController;
	homeActions?: ReactNode;
	onOpenArchive: () => void;
	onOpenDefenseArchive: () => void;
	onOpenThought: () => void;
}) {
	const { t } = useTranslation();
	return (
		<section className={styles['sector-selection']} aria-label={t('levelSelect.chooseLevel')}>
			<header className={styles['selection-section-head']}>
				<div className={styles['selection-heading-copy']}>
					<strong>{t('levelSelect.sectorSelectionHeading')}</strong>
					<span>{t('levelSelect.sectorHint')}</span>
				</div>
				<div className={styles['level-select-utilities']}>
					{homeActions}
					<button
						className={styles['thought-index-entry']}
						data-thought-index-entry
						onClick={onOpenThought}
						aria-label={t('thoughtIndex.entryAria')}
					>
						<span className={styles['thought-index-entry-trace']} aria-hidden="true">
							<i />
							<i />
							<i />
						</span>
						<strong>{t('thoughtIndex.entry')}</strong>
					</button>
					<button
						className={styles['defense-archive-entry']}
						onClick={onOpenDefenseArchive}
						aria-label={t('defenseArchive.entryAria')}
					>
						<span className={styles['defense-archive-entry-marks']} aria-hidden="true">
							<svg
								viewBox="0 0 44 30"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinejoin="miter"
								aria-hidden="true"
								focusable="false"
							>
								<path
									className={`${styles['defense-archive-sheet']} ${styles.back}`}
									d="M8 1.5h25l8 8v16H8z"
								/>
								<path
									className={`${styles['defense-archive-sheet']} ${styles.middle}`}
									d="M4.5 4.5h25l8 8v16h-33z"
								/>
								<path
									className={`${styles['defense-archive-sheet']} ${styles.front}`}
									d="M1.5 7.5h25l8 8v13h-33z"
								/>
								<path className={styles['defense-archive-index']} d="M6 12v12" />
								<path
									className={`${styles['defense-archive-data']} ${styles.primary}`}
									d="M12 13.5h11"
								/>
								<path
									className={`${styles['defense-archive-data']} ${styles.secondary}`}
									d="M12 18h16"
								/>
								<path
									className={`${styles['defense-archive-data']} ${styles.tertiary}`}
									d="M12 22.5h8"
								/>
							</svg>
						</span>
						<strong>{t('defenseArchive.entry')}</strong>
					</button>
					<button
						className={styles['signal-archive-entry']}
						data-signal-archive-entry
						onClick={onOpenArchive}
						aria-label={t('signalArchive.entryAria')}
					>
						<span className={styles['signal-archive-entry-spectrum']} aria-hidden="true">
							{SIGNAL_IDS.map((type) => (
								<i
									key={type}
									style={
										{ '--signal-color': signalRegistry.require(type).visual.color } as CSSProperties
									}
								/>
							))}
						</span>
						<strong>{t('signalArchive.entry')}</strong>
					</button>
					<MobileFullscreenButton />
				</div>
			</header>
			<div className={styles['level-carousel']}>
				<button
					className={`${styles['level-carousel-arrow']} ${styles.previous}`}
					onClick={() => selection.moveCarousel(-1)}
					disabled={selection.carouselStart === 0}
					aria-label={t('levelSelect.previousLevels')}
				>
					<UiIcon name="arrowLeft" />
				</button>
				<section
					key={selection.carouselStart}
					ref={selection.levelGroupRef}
					className={`${styles['level-grid']} ${selection.carouselDirection ? styles[`slide-${selection.carouselDirection}`] : ''}`}
					data-carousel-direction={selection.carouselDirection ?? undefined}
					data-level-grid
					role="radiogroup"
					aria-label={t('levelSelect.chooseLevel')}
				>
					{selection.visibleLevels.map((level, visibleIndex) => {
						const index = selection.carouselStart + visibleIndex;
						return (
							<button
								key={level.id}
								className={`selection-option ${styles['level-card']} ${level.id === selection.levelId ? styles.selected : ''}`}
								style={{ '--level-accent': level.accent } as CSSProperties}
								role="radio"
								aria-checked={level.id === selection.levelId}
								tabIndex={level.id === selection.levelId ? 0 : -1}
								onKeyDown={(event) => selection.cycleLevel(event, index)}
								onClick={() => selection.selectLevel(level.id, false)}
								onFocus={() => selection.selectLevel(level.id, false)}
							>
								<div className={styles['level-map-wrap']}>
									<LevelMap level={level} />
									<Tag className={styles['level-sector-tag']} tone="accent" monospace>
										{level.sector.replace('SECTOR ', '')}
									</Tag>
								</div>
								<div className={styles['level-card-copy']}>
									<div>
										<small>
											{Array.from({ length: 3 }, (_, rank) => (
												<UiIcon
													key={rank}
													name={rank < level.difficulty ? 'diamondFilled' : 'diamond'}
												/>
											))}
										</small>
										<b>{t('levelSelect.waves', { count: level.waves.length })}</b>
									</div>
									<h2>{levelName(t, level.id)}</h2>
									<p>{levelDescription(t, level.id)}</p>
									<footer>
										<Tag>{t('levelSelect.towerNodes', { count: level.towerPads.length })}</Tag>
									</footer>
								</div>
							</button>
						);
					})}
				</section>
				<button
					className={`${styles['level-carousel-arrow']} ${styles.next}`}
					onClick={() => selection.moveCarousel(1)}
					disabled={selection.carouselStart === selection.maximumCarouselStart}
					aria-label={t('levelSelect.nextLevels')}
				>
					<UiIcon name="arrowRight" />
				</button>
			</div>
		</section>
	);
}
