import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { LEVELS } from '@prism-bastion/game-core/game/config';
import { DIFFICULTIES } from '@prism-bastion/game-core/game/difficulty';
import type { DifficultyId } from '@prism-bastion/game-core/game/types';
import { difficultyName, levelName } from '@prism-bastion/web-shared/i18n/presentation';
import { navigateSelectionList } from '@prism-bastion/web-shared/ui/selectionListKeyboard';
import { UiIcon } from '@prism-bastion/web-shared/ui/UiIcon';
import { DefenseDetail } from './DefenseDetail';
import type { DefenseRecord } from './types';
import styles from '../DefenseArchive.module.css';

type ResultFilter = 'all' | 'won' | 'lost';
interface HistoryState {
	result: ResultFilter;
	levelId: string;
	difficultyId: 'all' | DifficultyId;
	page: number;
	selectedId: string | null;
}
type HistoryAction =
	| { type: 'filter-result'; value: ResultFilter }
	| { type: 'filter-level'; value: string }
	| { type: 'filter-difficulty'; value: 'all' | DifficultyId }
	| { type: 'select'; id: string | null }
	| { type: 'page'; page: number };
const initialState: HistoryState = { result: 'all', levelId: 'all', difficultyId: 'all', page: 0, selectedId: null };
const reduceHistory = (state: HistoryState, action: HistoryAction): HistoryState => {
	switch (action.type) {
		case 'filter-result':
			return { ...state, result: action.value, page: 0, selectedId: null };
		case 'filter-level':
			return { ...state, levelId: action.value, page: 0, selectedId: null };
		case 'filter-difficulty':
			return { ...state, difficultyId: action.value, page: 0, selectedId: null };
		case 'select':
			return { ...state, selectedId: action.id };
		case 'page':
			return { ...state, page: action.page };
	}
};
const PAGE_SIZE = 20;

export function DefenseArchiveHistory({ records }: { records: DefenseRecord[] }) {
	const { t } = useTranslation();
	const [state, dispatch] = useReducer(reduceHistory, initialState);
	const filtered = records.filter(
		(record) =>
			(state.result === 'all' || record.result === state.result) &&
			(state.levelId === 'all' || record.levelId === state.levelId) &&
			(state.difficultyId === 'all' || record.difficultyId === state.difficultyId),
	);
	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const visible = filtered.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
	const selected = records.find((record) => record.id === state.selectedId) ?? null;
	return (
		<div className={`${styles['history-layout']} ${selected ? styles['has-detail'] : ''}`}>
			<section className={styles['history-list']}>
				<div className={styles['history-filters']} aria-label={t('defenseArchive.filters')}>
					<label>
						<span>{t('defenseArchive.filter.result')}</span>
						<select
							value={state.result}
							onChange={(event) =>
								dispatch({ type: 'filter-result', value: event.currentTarget.value as ResultFilter })
							}
						>
							<option value="all">{t('defenseArchive.filter.all')}</option>
							<option value="won">{t('defenseArchive.result.won')}</option>
							<option value="lost">{t('defenseArchive.result.lost')}</option>
						</select>
					</label>
					<label>
						<span>{t('defenseArchive.filter.level')}</span>
						<select
							value={state.levelId}
							onChange={(event) => dispatch({ type: 'filter-level', value: event.currentTarget.value })}
						>
							<option value="all">{t('defenseArchive.filter.all')}</option>
							{LEVELS.map((level) => (
								<option key={level.id} value={level.id}>
									{levelName(t, level.id)}
								</option>
							))}
						</select>
					</label>
					<label>
						<span>{t('defenseArchive.filter.difficulty')}</span>
						<select
							value={state.difficultyId}
							onChange={(event) =>
								dispatch({
									type: 'filter-difficulty',
									value: event.currentTarget.value as 'all' | DifficultyId,
								})
							}
						>
							<option value="all">{t('defenseArchive.filter.all')}</option>
							{DIFFICULTIES.map((difficulty) => (
								<option key={difficulty.id} value={difficulty.id}>
									{difficultyName(t, difficulty.id)}
								</option>
							))}
						</select>
					</label>
				</div>
				{visible.length === 0 ? (
					<div className={`${styles['defense-archive-empty']} ${styles.compact}`}>
						<strong>{t('defenseArchive.noMatches')}</strong>
						<p>{t('defenseArchive.noMatchesDetail')}</p>
					</div>
				) : (
					<div className={styles['defense-list']} onKeyDown={navigateSelectionList}>
						{visible.map((record) => (
							<button
								key={record.id}
								data-result={record.result}
								aria-pressed={state.selectedId === record.id}
								onClick={() => dispatch({ type: 'select', id: record.id })}
							>
								<i aria-hidden="true" />
								<span>
									<strong>{levelName(t, record.levelId)}</strong>
									<small>{new Date(record.endedAt).toLocaleString()}</small>
								</span>
								<span>
									<b>{t(`defenseArchive.result.${record.result}`)}</b>
									<small>
										{difficultyName(t, record.difficultyId)} · {record.waveReached}/
										{record.maxWaves}
									</small>
								</span>
								<em>→</em>
							</button>
						))}
					</div>
				)}
				<footer className={styles['history-pages']}>
					<button
						disabled={state.page === 0}
						onClick={() => dispatch({ type: 'page', page: state.page - 1 })}
					>
						←
					</button>
					<span>
						{state.page + 1} / {pageCount}
					</span>
					<button
						disabled={state.page + 1 >= pageCount}
						onClick={() => dispatch({ type: 'page', page: state.page + 1 })}
					>
						→
					</button>
				</footer>
			</section>
			{selected ? (
				<DefenseDetail record={selected} onClose={() => dispatch({ type: 'select', id: null })} />
			) : (
				<aside className={styles['history-prompt']}>
					<div>
						<UiIcon name="diamond" />
					</div>
					<strong>{t('defenseArchive.selectDefense')}</strong>
					<p>{t('defenseArchive.selectDefenseDetail')}</p>
				</aside>
			)}
		</div>
	);
}
