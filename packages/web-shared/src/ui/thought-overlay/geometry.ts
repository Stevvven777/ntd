import { resolveRenderBounds } from '../../game/renderer';

export type OverlayPoint = readonly [number, number];
export interface OverlayPosition {
	readonly left: number;
	readonly top: number;
}
export interface OverlayRect {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

export const clamp = (value: number, minimum: number, maximum: number): number =>
	Math.max(minimum, Math.min(maximum, value));

export const overlapArea = (
	box: OverlayRect,
	obstacle: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
	rootBounds: Pick<DOMRect, 'left' | 'top'>,
): number => {
	const obstacleLeft = obstacle.left - rootBounds.left;
	const obstacleTop = obstacle.top - rootBounds.top;
	const overlapWidth = Math.max(
		0,
		Math.min(box.left + box.width, obstacleLeft + obstacle.width) - Math.max(box.left, obstacleLeft),
	);
	const overlapHeight = Math.max(
		0,
		Math.min(box.top + box.height, obstacleTop + obstacle.height) - Math.max(box.top, obstacleTop),
	);
	return overlapWidth * overlapHeight;
};

export const closestPointOnRect = (target: OverlayPoint, box: OverlayRect): OverlayPoint => {
	const right = box.left + box.width;
	const bottom = box.top + box.height;
	const [x, y] = target;
	const candidates: OverlayPoint[] = [
		[clamp(x, box.left, right), box.top],
		[clamp(x, box.left, right), bottom],
		[box.left, clamp(y, box.top, bottom)],
		[right, clamp(y, box.top, bottom)],
	];
	return candidates.reduce((closest, candidate) =>
		Math.hypot(candidate[0] - x, candidate[1] - y) < Math.hypot(closest[0] - x, closest[1] - y)
			? candidate
			: closest,
	);
};

export const elementRect = (element: HTMLElement): OverlayRect => ({
	left: element.offsetLeft,
	top: element.offsetTop,
	width: element.offsetWidth,
	height: element.offsetHeight,
});

export const elementCenter = (element: Element, root: HTMLElement): OverlayPoint => {
	const bounds = element.getBoundingClientRect();
	const rootBounds = root.getBoundingClientRect();
	return [bounds.left - rootBounds.left + bounds.width / 2, bounds.top - rootBounds.top + bounds.height / 2];
};

export const worldPoint = (
	root: HTMLElement,
	point: { readonly x: number; readonly y: number },
	camera: { readonly center: { readonly x: number; readonly y: number }; readonly height: number },
): OverlayPoint => {
	const view = resolveRenderBounds(root.clientWidth, root.clientHeight, camera);
	const scale = Math.min(root.clientWidth / view.width, root.clientHeight / view.height);
	return [
		(root.clientWidth - view.width * scale) / 2 + (point.x - view.x) * scale,
		(root.clientHeight - view.height * scale) / 2 + (point.y - view.y) * scale,
	];
};

export const worldScale = (
	width: number,
	height: number,
	camera: { readonly center: { readonly x: number; readonly y: number }; readonly height: number },
): number => {
	const view = resolveRenderBounds(width, height, camera);
	return Math.min(width / view.width, height / view.height);
};

export const positionedLoadout = ({
	tower,
	width,
	height,
	towerRadius,
	placement,
}: {
	tower: OverlayPoint;
	width: number;
	height: number;
	towerRadius: number;
	placement: 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}): OverlayPosition => {
	const gap = 10;
	const horizontal =
		placement === 'right'
			? tower[0] + towerRadius + gap
			: placement === 'left'
				? tower[0] - towerRadius - gap - width
				: placement.endsWith('right')
					? tower[0] - width * 0.25
					: tower[0] - width * 0.75;
	const vertical =
		placement === 'right' || placement === 'left'
			? tower[1] - height / 2
			: placement.startsWith('top')
				? tower[1] - towerRadius - gap - height
				: tower[1] + towerRadius + gap;
	return { left: horizontal, top: vertical };
};

export const trailPointIndex = (anchor: 'start' | 'middle' | 'end', pointCount: number): number => {
	if (anchor === 'start') {
		return 0;
	}
	if (anchor === 'end') {
		return pointCount - 1;
	}
	return Math.floor((pointCount - 1) / 2);
};
