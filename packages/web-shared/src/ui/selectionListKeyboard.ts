import type { KeyboardEvent } from 'react';

/** Move within a finite selection without wrapping at either edge. */
export function moveSelectionIndex(index: number, direction: number, count: number): number {
	if (count === 0) {
		return -1;
	}
	if (index < 0) {
		return direction > 0 ? 0 : count - 1;
	}
	return Math.max(0, Math.min(count - 1, index + direction));
}

/** Navigate a bounded list of selection buttons in displayed order. */
export function navigateSelectionList(event: KeyboardEvent<HTMLElement>): void {
	if (
		event.defaultPrevented ||
		event.altKey ||
		event.ctrlKey ||
		event.metaKey ||
		event.shiftKey ||
		event.nativeEvent.isComposing
	) {
		return;
	}
	const offset =
		event.key === 'ArrowRight' || event.key === 'ArrowDown'
			? 1
			: event.key === 'ArrowLeft' || event.key === 'ArrowUp'
				? -1
				: 0;
	if (offset === 0 && event.key !== 'Home' && event.key !== 'End') {
		return;
	}
	const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
	const index = buttons.findIndex((button) => button === event.target);
	if (index < 0) {
		return;
	}
	const nextIndex =
		event.key === 'Home'
			? 0
			: event.key === 'End'
				? buttons.length - 1
				: moveSelectionIndex(index, offset, buttons.length);
	const next = buttons[nextIndex];
	if (!next) {
		return;
	}
	event.preventDefault();
	event.stopPropagation();
	if (nextIndex === index) {
		return;
	}
	next.focus();
	next.click();
}
