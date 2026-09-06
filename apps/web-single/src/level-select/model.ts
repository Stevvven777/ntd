import type { CreativeSetup, DifficultyId, GameMode } from '@prism-bastion/game-core/game/types';

export interface LevelSelection {
	levelId: string;
	mode: GameMode;
	creative: CreativeSetup;
	difficultyId: DifficultyId;
}

export interface RememberedLevelSelection {
	levelId: string;
	mode: GameMode;
	difficultyId: DifficultyId;
}
