import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';

interface PanelPosition {
	x: number;
	y: number;
}
interface PanelDrag {
	pointerId: number;
	offsetX: number;
	offsetY: number;
	width: number;
	height: number;
}
const clampPosition = (x: number, y: number, width: number, height: number): PanelPosition => ({
	x: Math.max(8, Math.min(window.innerWidth - width - 8, x)),
	y: Math.max(8, Math.min(window.innerHeight - height - 8, y)),
});

export function useDraggablePanel() {
	const panelRef = useRef<HTMLElement>(null);
	const dragRef = useRef<PanelDrag | null>(null);
	const [position, setPosition] = useState<PanelPosition | null>(null);
	useEffect(() => {
		const keepOnScreen = (): void => {
			const bounds = panelRef.current?.getBoundingClientRect();
			if (bounds) {
				setPosition((current) =>
					current ? clampPosition(current.x, current.y, bounds.width, bounds.height) : null,
				);
			}
		};
		window.addEventListener('resize', keepOnScreen);
		return () => window.removeEventListener('resize', keepOnScreen);
	}, []);
	const begin = (event: PointerEvent<HTMLButtonElement>): void => {
		const bounds = panelRef.current?.getBoundingClientRect();
		if (!bounds) {
			return;
		}
		dragRef.current = {
			pointerId: event.pointerId,
			offsetX: event.clientX - bounds.left,
			offsetY: event.clientY - bounds.top,
			width: bounds.width,
			height: bounds.height,
		};
		setPosition({ x: bounds.left, y: bounds.top });
		event.currentTarget.setPointerCapture(event.pointerId);
		event.preventDefault();
	};
	const drag = (event: PointerEvent<HTMLButtonElement>): void => {
		const current = dragRef.current;
		if (!current || current.pointerId !== event.pointerId) {
			return;
		}
		setPosition(
			clampPosition(
				event.clientX - current.offsetX,
				event.clientY - current.offsetY,
				current.width,
				current.height,
			),
		);
	};
	const end = (event: PointerEvent<HTMLButtonElement>): void => {
		if (dragRef.current?.pointerId !== event.pointerId) {
			return;
		}
		dragRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};
	const nudge = (event: KeyboardEvent<HTMLButtonElement>): void => {
		const directions: Readonly<Record<string, readonly [number, number]>> = {
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
		};
		const direction = directions[event.key];
		const bounds = panelRef.current?.getBoundingClientRect();
		if (!direction || !bounds) {
			return;
		}
		event.preventDefault();
		const distance = event.shiftKey ? 40 : 12;
		const current = position ?? { x: bounds.left, y: bounds.top };
		setPosition(
			clampPosition(
				current.x + direction[0] * distance,
				current.y + direction[1] * distance,
				bounds.width,
				bounds.height,
			),
		);
	};
	const style: CSSProperties | undefined = position
		? { top: position.y, right: 'auto', bottom: 'auto', left: position.x, transform: 'none' }
		: undefined;
	return {
		panelRef,
		style,
		reset: () => setPosition(null),
		handleProps: {
			onPointerDown: begin,
			onPointerMove: drag,
			onPointerUp: end,
			onPointerCancel: end,
			onKeyDown: nudge,
		},
	};
}
