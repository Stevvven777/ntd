import { useEffect, useRef } from 'react';

/** Give the active page one default horizontal selection, even after focus is lost. */
export function usePageArrowNavigation(navigate: (direction: -1 | 1) => void) {
	const pageRef = useRef<HTMLElement>(null);
	useEffect(() => {
		if (!document.querySelector('[aria-modal="true"]')) {
			pageRef.current?.focus({ preventScroll: true });
		}
	}, []);
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent): void => {
			const page = pageRef.current;
			if (
				!page ||
				page.closest('[inert], [aria-hidden="true"]') ||
				event.defaultPrevented ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				event.shiftKey ||
				event.isComposing ||
				document.querySelector('[aria-modal="true"]')
			) {
				return;
			}
			if (
				event.target instanceof Element &&
				event.target.closest(
					'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="spinbutton"]',
				)
			) {
				return;
			}
			if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			navigate(event.key === 'ArrowRight' ? 1 : -1);
		};
		window.addEventListener('keydown', onKeyDown, true);
		return () => window.removeEventListener('keydown', onKeyDown, true);
	}, [navigate]);
	return pageRef;
}

export function navigatePageSelection(page: HTMLElement | null, selector: string, direction: -1 | 1): void {
	const buttons = Array.from(page?.querySelectorAll<HTMLButtonElement>(selector) ?? []).filter(
		(button) => !button.disabled,
	);
	if (buttons.length === 0) {
		return;
	}
	const selected = buttons.findIndex(
		(button) => button.hasAttribute('aria-current') || button.getAttribute('aria-selected') === 'true',
	);
	const index =
		selected < 0
			? direction === 1
				? 0
				: buttons.length - 1
			: (selected + direction + buttons.length) % buttons.length;
	buttons[index]?.focus();
	buttons[index]?.click();
}
