import type { OverlayRect } from './geometry';

export const fitLoadoutModule = (element: HTMLDivElement | null, moduleSelector: string): void => {
	if (!element) {
		return;
	}
	const modules = Array.from(element.querySelectorAll<HTMLElement>(moduleSelector));
	const width = Math.max(0, ...modules.map((module) => module.offsetWidth));
	if (width > 0) {
		element.style.setProperty('--loadout-module-width', `${Math.ceil(width)}px`);
	}
};

export const relativeRect = (element: HTMLElement): OverlayRect => ({
	left: element.offsetLeft,
	top: element.offsetTop,
	width: element.offsetWidth,
	height: element.offsetHeight,
});
