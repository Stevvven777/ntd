import {
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
	type RefObject,
	type KeyboardEvent,
} from 'react';
import type { GameEngine } from '@prism-bastion/game-core/game/engine';
import type { ModuleId, Tower } from '@prism-bastion/game-core/game/types';
import { matchesKeybinding, useKeybindings } from './keybindings';

/** Track an installed module through local swaps and authoritative plan updates. */
export function useWorkshopSelection(
	engine: GameEngine,
	tower: Tower,
	revision: number,
	workshopRef: RefObject<HTMLElement | null>,
	setSelectedModule: Dispatch<SetStateAction<ModuleId | null>>,
) {
	const [selectedSlot, setSelectedSlot] = useState<{ towerId: number; index: number; moduleId: ModuleId } | null>(
		null,
	);
	const pendingSelection = useRef<typeof selectedSlot>(null);
	const bindings = useKeybindings();
	const activeSlot =
		selectedSlot?.towerId === tower.id && tower.slots[selectedSlot.index] === selectedSlot.moduleId
			? selectedSlot
			: null;
	const selectLibraryModule = (moduleId: ModuleId): void => {
		pendingSelection.current = null;
		setSelectedSlot(null);
		setSelectedModule(moduleId);
	};
	const selectSlot = (index: number): void => {
		const moduleId = tower.slots[index];
		if (!moduleId) {
			return;
		}
		pendingSelection.current = null;
		setSelectedSlot({ towerId: tower.id, index, moduleId });
		setSelectedModule(moduleId);
	};
	const requestSelection = useCallback(
		(index: number, moduleId: ModuleId): void => {
			const selectedTower = engine.getSelectedTower();
			if (!selectedTower) {
				return;
			}
			pendingSelection.current = { towerId: selectedTower.id, index, moduleId };
		},
		[engine],
	);
	const installModule = useCallback(
		(index: number, moduleId: ModuleId | null): void => {
			pendingSelection.current = null;
			if (moduleId) {
				requestSelection(index, moduleId);
			}
			engine.installModule(index, moduleId);
			if (!engine.externallyControlled && engine.getSelectedTower()?.slots[index] !== moduleId) {
				pendingSelection.current = null;
			}
			if (!moduleId) {
				setSelectedSlot(null);
			}
		},
		[engine, requestSelection],
	);
	const swapModules = useCallback(
		(source: number, destination: number): void => {
			const selectedTower = engine.getSelectedTower();
			const moduleId = selectedTower?.slots[source];
			if (
				!selectedTower ||
				!moduleId ||
				destination < 0 ||
				destination >= selectedTower.slots.length ||
				source === destination
			) {
				return;
			}
			if (engine.externallyControlled && engine.status !== 'planning') {
				return;
			}
			requestSelection(destination, moduleId);
			engine.swapModules(source, destination);
		},
		[engine, requestSelection],
	);
	useLayoutEffect(() => {
		const pending = pendingSelection.current;
		if (!pending) {
			return;
		}
		if (pending.towerId !== tower.id) {
			pendingSelection.current = null;
			return;
		}
		if (tower.slots[pending.index] !== pending.moduleId) {
			return;
		}
		pendingSelection.current = null;
		setSelectedSlot(pending);
		setSelectedModule(pending.moduleId);
		workshopRef.current?.querySelector<HTMLButtonElement>(`[data-slot="${pending.index}"]`)?.focus();
	}, [tower, revision, workshopRef, setSelectedModule]);
	const moveSelectedModule = (event: KeyboardEvent<HTMLElement>): void => {
		if (!activeSlot || event.defaultPrevented || event.nativeEvent.isComposing) {
			return;
		}
		if (
			event.target instanceof Element &&
			event.target.closest('input, textarea, select, [contenteditable="true"]')
		) {
			return;
		}
		const left = matchesKeybinding(event, bindings.moveLeft);
		if (!left && !matchesKeybinding(event, bindings.moveRight)) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		swapModules(activeSlot.index, activeSlot.index + (left ? -1 : 1));
	};

	return { activeSlot, selectLibraryModule, selectSlot, installModule, swapModules, moveSelectedModule };
}

export type WorkshopSelection = ReturnType<typeof useWorkshopSelection>;
