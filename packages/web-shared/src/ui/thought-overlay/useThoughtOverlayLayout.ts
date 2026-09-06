import { useLayoutEffect, useRef, useState } from 'react';
import type { ThoughtSceneDirector } from '../../thoughts';
import type { ThoughtOverlayTarget, ThoughtPlayerSnapshot } from '../../thoughts/types';
import styles from '../ThoughtFlowOverlay.module.css';
import { fitLoadoutModule } from './dom';
import {
	clamp,
	closestPointOnRect,
	elementCenter,
	elementRect,
	overlapArea,
	positionedLoadout,
	trailPointIndex,
	worldPoint,
	worldScale,
	type OverlayPoint,
	type OverlayPosition,
} from './geometry';

export interface LineGeometry {
	readonly width: number;
	readonly height: number;
	readonly path: string;
	readonly target: OverlayPoint;
}

export function useThoughtOverlayLayout(
	director: ThoughtSceneDirector,
	snapshot: ThoughtPlayerSnapshot,
	translationRevision: unknown,
) {
	const overlay = snapshot.overlay;
	const rootRef = useRef<HTMLDivElement>(null);
	const loadoutRefs = useRef(new Map<number, HTMLDivElement>());
	const compactLoadoutRefs = useRef(new Map<number, HTMLDivElement>());
	const calloutRef = useRef<HTMLElement>(null);
	const [line, setLine] = useState<LineGeometry | null>(null);
	const [calloutPosition, setCalloutPosition] = useState<OverlayPosition | null>(null);
	const [loadoutPositions, setLoadoutPositions] = useState<Record<number, OverlayPosition>>({});
	const [compactPositions, setCompactPositions] = useState<Record<number, OverlayPosition>>({});
	const [placementBurstPosition, setPlacementBurstPosition] = useState<OverlayPosition | null>(null);
	const registerOverlayRef = (
		refs: Map<number, HTMLDivElement>,
		towerIndex: number,
		element: HTMLDivElement | null,
	): void => {
		if (element) {
			refs.set(towerIndex, element);
		} else {
			refs.delete(towerIndex);
		}
	};

	useLayoutEffect(() => {
		for (const loadout of loadoutRefs.current.values()) {
			loadout
				.querySelectorAll<HTMLDivElement>(`.${styles['thought-loadout-module-reveal']!}`)
				.forEach((element) => fitLoadoutModule(element, `.${styles['thought-loadout-module']!}`));
		}
	}, [snapshot.cueId, translationRevision]);

	useLayoutEffect(() => {
		const root = rootRef.current;
		if (!root) {
			setLine(null);
			return undefined;
		}
		const resolveWorldPoint = (point: { readonly x: number; readonly y: number }): OverlayPoint => {
			const camera = director.definition.scene?.camera ?? { center: { x: 465, y: 530 }, height: 240 };
			return worldPoint(root, point, camera);
		};
		const resolveTarget = (target: ThoughtOverlayTarget): OverlayPoint => {
			if (typeof target === 'object' && 'slot' in target) {
				const towerIndex = target.towerIndex ?? 0;
				const slot = root.querySelector(
					`[data-thought-tower="${towerIndex}"] [data-thought-slot="${target.slot}"]`,
				);
				const icon = slot?.querySelector('[data-thought-module-icon]') ?? slot;
				if (icon) {
					return elementCenter(icon, root);
				}
			}
			if (typeof target === 'object' && 'towerIndex' in target) {
				const tower = director.runtime.engine.towers[target.towerIndex];
				if (tower) {
					return resolveWorldPoint(tower.position);
				}
			}
			if (typeof target === 'object' && 'signalRef' in target) {
				const signal = director.getBoundSignal(target.signalRef);
				if (signal) {
					return resolveWorldPoint(signal.position);
				}
			}
			if (typeof target === 'object' && 'projectileRef' in target) {
				const projectile = director.getBoundProjectile(target.projectileRef);
				if (projectile) {
					return resolveWorldPoint(projectile.position);
				}
			}
			if (typeof target === 'object' && 'projectileGroupRef' in target) {
				const projectiles = director.getBoundProjectileGroup(target.projectileGroupRef);
				if (projectiles.length > 0) {
					const center = projectiles.reduce(
						(sum, projectile) => ({
							x: sum.x + projectile.position.x / projectiles.length,
							y: sum.y + projectile.position.y / projectiles.length,
						}),
						{ x: 0, y: 0 },
					);
					return resolveWorldPoint(center);
				}
			}
			if (typeof target === 'object' && 'trailRef' in target) {
				const trail = director.getBoundTrail(target.trailRef);
				if (trail && trail.points.length > 0) {
					const index = trailPointIndex(target.anchor, trail.points.length);
					const point = trail.points[index];
					if (point) {
						return resolveWorldPoint(point);
					}
				}
			}
			if (target === 'signal') {
				const signal = director.runtime.engine.signals.find((candidate) => !candidate.dead);
				if (signal) {
					return resolveWorldPoint(signal.position);
				}
			}
			const tower = director.runtime.engine.towers[0];
			return resolveWorldPoint(tower?.position ?? director.definition.scene?.tower ?? { x: 580, y: 455 });
		};
		const positionCallout = (): void => {
			const callout = calloutRef.current;
			if (overlay?.type !== 'caption' || !callout || root.clientWidth <= 0 || root.clientHeight <= 0) {
				return;
			}
			const target = resolveTarget(overlay.target);
			const width = callout.offsetWidth;
			const height = callout.offsetHeight;
			const margin = Math.min(20, root.clientWidth * 0.03);
			const gap = Math.min(36, root.clientWidth * 0.045);
			const availableWidth = Math.max(0, root.clientWidth - margin * 2);
			const availableHeight = Math.max(0, root.clientHeight - margin * 2);
			const boundedWidth = Math.min(width, availableWidth);
			const boundedHeight = Math.min(height, availableHeight);
			const paragraph = callout.querySelector('p');
			const readingInsetX = paragraph?.offsetLeft ?? 0;
			const readingInsetY = paragraph?.offsetTop ?? 0;
			const rootBounds = root.getBoundingClientRect();
			const obstacles = [...loadoutRefs.current.values(), ...compactLoadoutRefs.current.values()].map((element) =>
				element.getBoundingClientRect(),
			);
			const containingObstacle = obstacles.find(
				(obstacle) =>
					target[0] >= obstacle.left - rootBounds.left &&
					target[0] <= obstacle.right - rootBounds.left &&
					target[1] >= obstacle.top - rootBounds.top &&
					target[1] <= obstacle.bottom - rootBounds.top,
			);
			const anchor = containingObstacle
				? {
						left: containingObstacle.left - rootBounds.left,
						right: containingObstacle.right - rootBounds.left,
						top: containingObstacle.top - rootBounds.top,
						bottom: containingObstacle.bottom - rootBounds.top,
					}
				: { left: target[0], right: target[0], top: target[1], bottom: target[1] };
			const preferredCandidates: readonly OverlayPosition[] = [
				{ left: target[0] - readingInsetX, top: anchor.top - boundedHeight - gap },
				{ left: target[0] - readingInsetX, top: anchor.bottom + gap },
				{ left: anchor.right + gap, top: target[1] - readingInsetY },
			];
			const fallbackCandidates: readonly OverlayPosition[] = [
				{ left: target[0] - boundedWidth + readingInsetX, top: anchor.top - boundedHeight - gap },
				{ left: target[0] - boundedWidth + readingInsetX, top: anchor.bottom + gap },
				{ left: anchor.left - boundedWidth - gap, top: target[1] - boundedHeight + readingInsetY },
				{ left: target[0] - boundedWidth / 2, top: anchor.top - boundedHeight - gap },
				{ left: target[0] - boundedWidth / 2, top: anchor.bottom + gap },
			];
			const overlapFor = (candidate: OverlayPosition): number =>
				obstacles.reduce(
					(sum, obstacle) =>
						sum +
						overlapArea({ ...candidate, width: boundedWidth, height: boundedHeight }, obstacle, rootBounds),
					0,
				);
			const fits = (candidate: OverlayPosition): boolean =>
				candidate.left >= margin &&
				candidate.top >= margin &&
				candidate.left + boundedWidth <= root.clientWidth - margin &&
				candidate.top + boundedHeight <= root.clientHeight - margin;
			const preferred = preferredCandidates.find((candidate) => fits(candidate) && overlapFor(candidate) === 0);
			const candidates = preferred ? [preferred] : [...preferredCandidates, ...fallbackCandidates];
			const ranked = candidates.map((candidate, index) => {
				const left = clamp(candidate.left, margin, root.clientWidth - boundedWidth - margin);
				const top = clamp(candidate.top, margin, root.clientHeight - boundedHeight - margin);
				const displacement = Math.abs(left - candidate.left) + Math.abs(top - candidate.top);
				const overlap = overlapFor({ left, top });
				return { left, top, score: displacement * 100 + (overlap > 0 ? 1_000_000 + overlap * 100 : 0) + index };
			});
			const best = ranked.reduce((current, candidate) => (candidate.score < current.score ? candidate : current));
			setCalloutPosition((current) =>
				current?.left === best.left && current.top === best.top ? current : { left: best.left, top: best.top },
			);
		};
		const positionCompactLoadout = (towerIndex: number, compact: HTMLDivElement): void => {
			if (root.clientWidth <= 0 || root.clientHeight <= 0) {
				return;
			}
			const tower = director.runtime.engine.towers[towerIndex];
			const towerPosition = resolveWorldPoint(
				tower?.position ?? director.definition.scene?.tower ?? { x: 580, y: 455 },
			);
			const camera = director.definition.scene?.camera ?? { center: { x: 465, y: 530 }, height: 240 };
			const towerRadius = 35 * worldScale(root.clientWidth, root.clientHeight, camera);
			const gap = 12;
			const margin = 8;
			const left = clamp(
				towerPosition[0],
				compact.offsetWidth / 2 + margin,
				root.clientWidth - compact.offsetWidth / 2 - margin,
			);
			const top = clamp(
				towerPosition[1] + towerRadius + gap + compact.offsetHeight / 2,
				compact.offsetHeight / 2 + margin,
				root.clientHeight - compact.offsetHeight / 2 - margin,
			);
			setCompactPositions((current) =>
				current[towerIndex]?.left === left && current[towerIndex]?.top === top
					? current
					: { ...current, [towerIndex]: { left, top } },
			);
		};
		const positionLoadoutDialog = (
			target: ThoughtPlayerSnapshot['loadoutTargets'][number],
			dialog: HTMLDivElement,
		): void => {
			if (root.clientWidth <= 0 || root.clientHeight <= 0) {
				return;
			}
			const tower = director.runtime.engine.towers[target.towerIndex];
			const towerPosition = resolveWorldPoint(
				tower?.position ?? director.definition.scene?.tower ?? { x: 580, y: 455 },
			);
			const camera = director.definition.scene?.camera ?? { center: { x: 465, y: 530 }, height: 240 };
			const towerRadius = 35 * worldScale(root.clientWidth, root.clientHeight, camera);
			const margin = 12;
			const preferred = positionedLoadout({
				tower: towerPosition,
				width: dialog.offsetWidth,
				height: dialog.offsetHeight,
				towerRadius,
				placement: target.placement,
			});
			const left = clamp(preferred.left, margin, root.clientWidth - dialog.offsetWidth - margin);
			const top = clamp(preferred.top, margin, root.clientHeight - dialog.offsetHeight - margin);
			setLoadoutPositions((current) =>
				current[target.towerIndex]?.left === left && current[target.towerIndex]?.top === top
					? current
					: { ...current, [target.towerIndex]: { left, top } },
			);
		};
		const positionPlacementBurst = (): void => {
			if (!snapshot.placementBurst) {
				return;
			}
			const tower = director.runtime.engine.towers[snapshot.placementBurstTowerIndex];
			if (!tower) {
				return;
			}
			const [left, top] = resolveWorldPoint(tower.position);
			setPlacementBurstPosition((current) =>
				current?.left === left && current.top === top ? current : { left, top },
			);
		};
		const update = (): void => {
			if (!overlay) {
				setLine(null);
				return;
			}
			if (overlay.type === 'loadout' || overlay.type === 'loadouts') {
				setLine(null);
				return;
			}
			const destinationElement = calloutRef.current;
			if (!destinationElement) {
				setLine(null);
				return;
			}
			const target = resolveTarget(overlay.target);
			const destination = closestPointOnRect(target, elementRect(destinationElement));
			const nextLine = {
				width: root.clientWidth,
				height: root.clientHeight,
				path: `M ${target[0]} ${target[1]} L ${destination[0]} ${destination[1]}`,
				target,
			} as const;
			setLine((current) =>
				current?.width === nextLine.width &&
				current.height === nextLine.height &&
				current.path === nextLine.path
					? current
					: nextLine,
			);
		};
		let frame = 0;
		const animate = (): void => {
			update();
			frame = requestAnimationFrame(animate);
		};
		const positionOverlays = (): void => {
			for (const target of snapshot.loadoutTargets) {
				const loadout = loadoutRefs.current.get(target.towerIndex);
				if (loadout) {
					positionLoadoutDialog(target, loadout);
				}
				const compact = compactLoadoutRefs.current.get(target.towerIndex);
				if (compact) {
					positionCompactLoadout(target.towerIndex, compact);
				}
			}
			positionPlacementBurst();
			positionCallout();
		};
		positionOverlays();
		frame = requestAnimationFrame(animate);
		let layoutFrame = requestAnimationFrame(positionOverlays);
		const observer =
			typeof ResizeObserver === 'undefined'
				? null
				: new ResizeObserver(() => {
						positionOverlays();
						cancelAnimationFrame(layoutFrame);
						layoutFrame = requestAnimationFrame(positionOverlays);
						update();
					});
		observer?.observe(root);
		for (const loadout of loadoutRefs.current.values()) {
			observer?.observe(loadout);
		}
		if (calloutRef.current) {
			observer?.observe(calloutRef.current);
		}
		return () => {
			cancelAnimationFrame(frame);
			cancelAnimationFrame(layoutFrame);
			observer?.disconnect();
		};
	}, [director, overlay, snapshot.cueId, snapshot.loadoutMode, snapshot.loadoutPlacement, snapshot.loadoutTargets]);

	return {
		rootRef,
		calloutRef,
		line,
		calloutPosition,
		loadoutPositions,
		compactPositions,
		placementBurstPosition,
		registerDialog: (towerIndex: number, element: HTMLDivElement | null) =>
			registerOverlayRef(loadoutRefs.current, towerIndex, element),
		registerCompact: (towerIndex: number, element: HTMLDivElement | null) =>
			registerOverlayRef(compactLoadoutRefs.current, towerIndex, element),
	};
}
