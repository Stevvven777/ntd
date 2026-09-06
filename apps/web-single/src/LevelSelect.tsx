import { UiIcon } from '@prism-bastion/web-shared/ui/UiIcon';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getLevel } from '@prism-bastion/game-core/game/config';
import { getDifficulty } from '@prism-bastion/game-core/game/difficulty';
import { difficultyName, levelName } from '@prism-bastion/web-shared/i18n/presentation';
import { SettingsPanel } from '@prism-bastion/web-shared/ui/SettingsPanel';
import { usePageArrowNavigation } from '@prism-bastion/web-shared/ui/usePageArrowNavigation';
import { HomeComposition } from './HomeComposition';
import { LevelCarousel } from './level-select/LevelCarousel';
import { MissionSetup } from './level-select/MissionSetup';
import { useLevelSelection } from './level-select/useLevelSelection';
import styles from './LevelSelect.module.css';

export type { LevelSelection } from './level-select/model';
export { LEVEL_SELECTION_STORAGE_KEY } from './level-select/storage';
import type { LevelSelection } from './level-select/model';

export function LevelSelect({
	onStart,
	onOpenArchive,
	onOpenDefenseArchive,
	onOpenThought,
	homeActions,
}: {
	onStart: (selection: LevelSelection) => void;
	onOpenArchive: () => void;
	onOpenDefenseArchive: () => void;
	onOpenThought: () => void;
	homeActions?: ReactNode;
}) {
	const { t } = useTranslation();
	const selection = useLevelSelection();
	const selectedLevel = getLevel(selection.levelId);
	const selectedDifficulty = getDifficulty(selection.difficultyId);
	const pageRef = usePageArrowNavigation(selection.selectRelativeLevel);
	const start = (): void =>
		onStart({
			levelId: selection.levelId,
			mode: selection.mode,
			creative: selection.creative,
			difficultyId: selection.difficultyId,
		});

	return (
		<main ref={pageRef} tabIndex={-1} className={styles['level-select-shell']}>
			<div className={styles['level-select-frame']} data-level-select-frame>
				<header className={styles['level-select-head']}>
					<section className={styles['level-select-intro']}>
						<h1>{t('levelSelect.gameTitle')}</h1>
						<SettingsPanel />
					</section>
					<button className={styles['begin-run']} onClick={start}>
						<span>
							<small>
								{selection.mode === 'creative'
									? t('levelSelect.creativeTitle')
									: difficultyName(t, selectedDifficulty.id)}{' '}
								· {levelName(t, selectedLevel.id)}
							</small>
							<strong>{t('levelSelect.startAction')}</strong>
						</span>
						<b aria-hidden="true">
							<UiIcon name="arrowRight" />
						</b>
					</button>
				</header>
				<MissionSetup selection={selection} />
				<LevelCarousel
					selection={selection}
					homeActions={homeActions}
					onOpenArchive={onOpenArchive}
					onOpenDefenseArchive={onOpenDefenseArchive}
					onOpenThought={onOpenThought}
				/>
				<HomeComposition />
			</div>
		</main>
	);
}
