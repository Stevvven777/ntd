import { DIFFICULTIES } from '@prism-bastion/game-core/game/difficulty';
import type { DifficultyId, GameMode } from '@prism-bastion/game-core/game/types';
import { LEVELS } from '@prism-bastion/game-core/game/config';
import type { RememberedLevelSelection } from './model';

export const LEVEL_SELECTION_STORAGE_KEY = 'prism-bastion-level-selection';

const isGameMode = (value: unknown): value is GameMode => value === 'standard' || value === 'creative';
const isDifficultyId = (value: unknown): value is DifficultyId =>
	DIFFICULTIES.some((difficulty) => difficulty.id === value);
const isLevelId = (value: unknown): value is string => LEVELS.some((level) => level.id === value);

export const readRememberedSelection = (): RememberedLevelSelection | null => {
	try {
		const raw = globalThis.localStorage?.getItem(LEVEL_SELECTION_STORAGE_KEY);
		if (!raw) {
			return null;
		}
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) {
			return null;
		}
		const selection = parsed as Record<string, unknown>;
		if (!isLevelId(selection.levelId) || !isGameMode(selection.mode) || !isDifficultyId(selection.difficultyId)) {
			return null;
		}
		return { levelId: selection.levelId, mode: selection.mode, difficultyId: selection.difficultyId };
	} catch {
		return null;
	}
};

export const rememberSelection = (selection: RememberedLevelSelection): void => {
	try {
		globalThis.localStorage?.setItem(LEVEL_SELECTION_STORAGE_KEY, JSON.stringify(selection));
	} catch {
		// Storage may be unavailable in privacy-restricted browser contexts.
	}
};
