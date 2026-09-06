import { useEffect, type RefObject } from 'react';

const focusableSelector = 'button:not(:disabled):not([tabindex="-1"]), a[href], [tabindex="0"]';

export function useDialogFocusTrap(
	open: boolean,
	dialogRef: RefObject<HTMLElement | null>,
	onEscape: () => void,
): void {
	useEffect(() => {
		if (!open) {
			return;
		}
		dialogRef.current?.querySelector<HTMLElement>('[autofocus], [role="tab"][aria-selected="true"]')?.focus();
		const handleKeyDown = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onEscape();
				return;
			}
			if (event.key !== 'Tab') {
				return;
			}
			const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
			const first = controls[0];
			const last = controls.at(-1);
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first?.focus();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [dialogRef, onEscape, open]);
}
