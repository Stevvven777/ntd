import { moveSelectionIndex } from '@prism-bastion/web-shared/ui/selectionListKeyboard';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, type KeyboardEvent } from 'react';
import { DEFAULT_LEVEL_ID, getLevel, LEVELS } from '@prism-bastion/game-core/game/config';
import { DEFAULT_DIFFICULTY_ID, DIFFICULTIES } from '@prism-bastion/game-core/game/difficulty';
import type { CreativeSetup, DifficultyId, GameMode } from '@prism-bastion/game-core/game/types';
import { readRememberedSelection, rememberSelection } from './storage';

const DESKTOP_VISIBLE_LEVEL_COUNT = 3;
const COMPACT_VISIBLE_LEVEL_COUNT = 1;
const COMPACT_LEVEL_QUERY = '(max-width: 980px)';

interface State {
	levelId: string;
	mode: GameMode;
	difficultyId: DifficultyId;
	creative: CreativeSetup;
	visibleLevelCount: number;
	carouselStart: number;
	carouselDirection: 'next' | 'previous' | null;
}
type Action =
	| { type: 'set-mode'; mode: GameMode }
	| { type: 'set-difficulty'; difficultyId: DifficultyId }
	| { type: 'set-creative'; creative: CreativeSetup }
	| { type: 'select-level'; levelId: string; reveal: boolean }
	| { type: 'move-carousel'; offset: number }
	| { type: 'resize'; visibleLevelCount: number };

const initialCreativeSetup = (levelId: string): CreativeSetup => ({
	healthScale: 1,
	speedScale: 1,
	coreStability: 20,
	waveCount: getLevel(levelId).waves.length,
});
const visibleCountForViewport = (): number =>
	globalThis.matchMedia?.(COMPACT_LEVEL_QUERY).matches ? COMPACT_VISIBLE_LEVEL_COUNT : DESKTOP_VISIBLE_LEVEL_COUNT;
const clampCarousel = (start: number, visibleCount: number): number =>
	Math.max(0, Math.min(LEVELS.length - visibleCount, start));

const initialize = (): State => {
	const remembered = readRememberedSelection();
	const levelId = remembered?.levelId ?? DEFAULT_LEVEL_ID;
	const visibleLevelCount = visibleCountForViewport();
	const selectedIndex = Math.max(
		0,
		LEVELS.findIndex((level) => level.id === levelId),
	);
	const carouselStart =
		visibleLevelCount === COMPACT_VISIBLE_LEVEL_COUNT
			? selectedIndex
			: clampCarousel(selectedIndex - Math.floor(visibleLevelCount / 2), visibleLevelCount);
	return {
		levelId,
		mode: remembered?.mode ?? 'standard',
		difficultyId: remembered?.difficultyId ?? DEFAULT_DIFFICULTY_ID,
		creative: initialCreativeSetup(levelId),
		visibleLevelCount,
		carouselStart,
		carouselDirection: null,
	};
};

const reducer = (state: State, action: Action): State => {
	switch (action.type) {
		case 'set-mode':
			return { ...state, mode: action.mode };
		case 'set-difficulty':
			return { ...state, difficultyId: action.difficultyId };
		case 'set-creative':
			return { ...state, creative: action.creative };
		case 'resize': {
			const selectedIndex = LEVELS.findIndex((level) => level.id === state.levelId);
			const carouselStart =
				action.visibleLevelCount === COMPACT_VISIBLE_LEVEL_COUNT
					? selectedIndex
					: clampCarousel(state.carouselStart, action.visibleLevelCount);
			return { ...state, visibleLevelCount: action.visibleLevelCount, carouselStart, carouselDirection: null };
		}
		case 'select-level': {
			const selectedIndex = LEVELS.findIndex((level) => level.id === action.levelId);
			const maximumStart = Math.max(0, LEVELS.length - state.visibleLevelCount);
			const nextStart = action.reveal
				? Math.max(
						0,
						Math.min(
							maximumStart,
							selectedIndex < state.carouselStart
								? selectedIndex
								: Math.max(state.carouselStart, selectedIndex - state.visibleLevelCount + 1),
						),
					)
				: state.carouselStart;
			return {
				...state,
				levelId: action.levelId,
				creative: { ...state.creative, waveCount: getLevel(action.levelId).waves.length },
				carouselStart: nextStart,
				carouselDirection:
					nextStart === state.carouselStart
						? state.carouselDirection
						: nextStart > state.carouselStart
							? 'next'
							: 'previous',
			};
		}
		case 'move-carousel': {
			const nextStart = clampCarousel(state.carouselStart + action.offset, state.visibleLevelCount);
			if (nextStart === state.carouselStart) {
				return state;
			}
			const selectedIndex = LEVELS.findIndex((level) => level.id === state.levelId);
			const nextSelection =
				selectedIndex < nextStart || selectedIndex >= nextStart + state.visibleLevelCount
					? (LEVELS[nextStart]?.id ?? state.levelId)
					: state.levelId;
			return {
				...state,
				carouselStart: nextStart,
				carouselDirection: action.offset > 0 ? 'next' : 'previous',
				levelId: nextSelection,
				creative:
					nextSelection === state.levelId
						? state.creative
						: { ...state.creative, waveCount: getLevel(nextSelection).waves.length },
			};
		}
	}
};

const arrowOffset = (key: string): number => {
	if (key === 'ArrowRight' || key === 'ArrowDown') {
		return 1;
	}
	if (key === 'ArrowLeft' || key === 'ArrowUp') {
		return -1;
	}
	return 0;
};

export function useLevelSelection() {
	const [state, dispatch] = useReducer(reducer, undefined, initialize);
	const levelGroupRef = useRef<HTMLElement>(null);
	const focusAfterNavigation = useRef(false);
	useEffect(
		() => rememberSelection({ levelId: state.levelId, mode: state.mode, difficultyId: state.difficultyId }),
		[state.difficultyId, state.levelId, state.mode],
	);
	useEffect(() => {
		const mediaQuery = globalThis.matchMedia?.(COMPACT_LEVEL_QUERY);
		if (!mediaQuery) {
			return;
		}
		const resize = (event: MediaQueryListEvent): void =>
			dispatch({ type: 'resize', visibleLevelCount: event.matches ? 1 : 3 });
		mediaQuery.addEventListener('change', resize);
		return () => mediaQuery.removeEventListener('change', resize);
	}, []);
	useLayoutEffect(() => {
		if (!focusAfterNavigation.current) {
			return;
		}
		focusAfterNavigation.current = false;
		levelGroupRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
	}, [state.carouselStart, state.levelId]);
	const selectLevel = useCallback(
		(levelId: string, reveal = true): void => dispatch({ type: 'select-level', levelId, reveal }),
		[],
	);
	const selectRelativeLevel = (offset: number): void => {
		const index = LEVELS.findIndex((level) => level.id === state.levelId);
		const next = LEVELS[moveSelectionIndex(index, offset, LEVELS.length)];
		if (!next || next.id === state.levelId) {
			return;
		}
		focusAfterNavigation.current = true;
		selectLevel(next.id);
	};
	const cycleLevel = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
		const offset = arrowOffset(event.key);
		if (offset === 0) {
			return;
		}
		event.preventDefault();
		const next = LEVELS[moveSelectionIndex(index, offset, LEVELS.length)];
		if (!next || next.id === state.levelId) {
			return;
		}
		focusAfterNavigation.current = true;
		selectLevel(next.id);
	};
	const cycleDifficulty = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
		const offset = arrowOffset(event.key);
		if (offset === 0) {
			return;
		}
		event.preventDefault();
		const next = DIFFICULTIES[moveSelectionIndex(index, offset, DIFFICULTIES.length)];
		if (!next || next.id === state.difficultyId) {
			return;
		}
		dispatch({ type: 'set-difficulty', difficultyId: next.id });
		const group = event.currentTarget.parentElement;
		requestAnimationFrame(
			() =>
				group?.contains(document.activeElement) && group.querySelector<HTMLElement>('[tabindex="0"]')?.focus(),
		);
	};
	return {
		...state,
		levelGroupRef,
		maximumCarouselStart: Math.max(0, LEVELS.length - state.visibleLevelCount),
		visibleLevels: LEVELS.slice(state.carouselStart, state.carouselStart + state.visibleLevelCount),
		setMode: (mode: GameMode) => dispatch({ type: 'set-mode', mode }),
		setDifficultyId: (difficultyId: DifficultyId) => dispatch({ type: 'set-difficulty', difficultyId }),
		setCreative: (creative: CreativeSetup) => dispatch({ type: 'set-creative', creative }),
		selectLevel,
		selectRelativeLevel,
		cycleLevel,
		cycleDifficulty,
		moveCarousel: (offset: number) => dispatch({ type: 'move-carousel', offset }),
	};
}

export type LevelSelectionController = ReturnType<typeof useLevelSelection>;
