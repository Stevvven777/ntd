import { DIFFICULTIES } from '@prism-bastion/game-core/game/difficulty';
import { difficultyName } from '@prism-bastion/web-shared/i18n/presentation';
import { CalibrationSlider } from '@prism-bastion/web-shared/ui/CalibrationSlider';
import { UiIcon } from '@prism-bastion/web-shared/ui/UiIcon';
import { useTranslation } from 'react-i18next';
import type { LevelSelectionController } from './useLevelSelection';
import styles from '../LevelSelect.module.css';

const positiveInteger = (value: number, fallback: number): number =>
	Number.isFinite(value) ? Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.round(value))) : fallback;

export function MissionSetup({ selection }: { selection: LevelSelectionController }) {
	const { t } = useTranslation();
	const { mode, creative } = selection;
	const updateCreative = (patch: Partial<typeof creative>): void => selection.setCreative({ ...creative, ...patch });
	return (
		<section
			className={styles['mission-controls']}
			data-mission-controls
			aria-label={t('levelSelect.missionSetup')}
		>
			<div className={styles['mode-selector']} role="group" aria-label={t('levelSelect.modeLabel')}>
				{(['standard', 'creative'] as const).map((item) => (
					<button
						key={item}
						aria-pressed={mode === item}
						className={mode === item ? styles.active : undefined}
						onClick={() => selection.setMode(item)}
					>
						<strong>{t(`levelSelect.${item}Title`)}</strong>
						<small>{t(`levelSelect.${item}Detail`)}</small>
					</button>
				))}
			</div>
			{mode === 'creative' ? (
				<section
					className={styles['creative-setup-card']}
					data-creative-setup
					aria-label={t('levelSelect.creativeTitle')}
				>
					<div className={styles['setup-rules']} data-setup-rules>
						<label className={styles['core-rule']}>
							<span>{t('levelSelect.coreStability')}</span>
							<div>
								<input
									aria-label={t('levelSelect.coreStability')}
									type="number"
									min="1"
									value={creative.coreStability}
									onChange={(event) =>
										updateCreative({
											coreStability: positiveInteger(
												Number(event.currentTarget.value),
												creative.coreStability,
											),
										})
									}
								/>
								<b aria-hidden="true">
									<UiIcon name="heart" />
								</b>
							</div>
						</label>
						<label className={styles['wave-rule']}>
							<span>{t('levelSelect.waveCount')}</span>
							<div>
								<input
									aria-label={t('levelSelect.waveCount')}
									type="number"
									min="1"
									value={creative.waveCount}
									onChange={(event) =>
										updateCreative({
											waveCount: positiveInteger(
												Number(event.currentTarget.value),
												creative.waveCount,
											),
										})
									}
								/>
								<b aria-hidden="true">
									<UiIcon name="waves" />
								</b>
							</div>
						</label>
					</div>
					<div className={styles['setup-scales']} data-setup-scales>
						<CalibrationSlider
							label={t('levelSelect.healthScale')}
							min={0.25}
							max={5}
							step={0.25}
							value={creative.healthScale}
							onChange={(healthScale) => updateCreative({ healthScale })}
						/>
						<CalibrationSlider
							label={t('levelSelect.speedScale')}
							min={0.25}
							max={3}
							step={0.25}
							value={creative.speedScale}
							onChange={(speedScale) => updateCreative({ speedScale })}
						/>
					</div>
				</section>
			) : (
				<section className={styles['difficulty-select']} aria-label={t('levelSelect.difficultyLabel')}>
					<div
						className={styles['difficulty-options']}
						role="radiogroup"
						aria-label={t('levelSelect.chooseDifficulty')}
					>
						{DIFFICULTIES.map((difficulty, index) => (
							<button
								key={difficulty.id}
								className={`selection-option ${difficulty.id === selection.difficultyId ? styles.selected : ''}`}
								data-rank={difficulty.rank}
								role="radio"
								aria-checked={difficulty.id === selection.difficultyId}
								tabIndex={difficulty.id === selection.difficultyId ? 0 : -1}
								onKeyDown={(event) => selection.cycleDifficulty(event, index)}
								onClick={() => selection.setDifficultyId(difficulty.id)}
								onFocus={() => selection.setDifficultyId(difficulty.id)}
							>
								<span>
									{difficulty.rank === 0
										? '—'
										: Array.from({ length: Math.abs(difficulty.rank) }, (_, rank) => (
												<UiIcon
													key={rank}
													name={difficulty.rank < 0 ? 'diamond' : 'diamondFilled'}
												/>
											))}
								</span>
								<strong>{difficultyName(t, difficulty.id)}</strong>
							</button>
						))}
					</div>
				</section>
			)}
		</section>
	);
}
