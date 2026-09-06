import { useEffect, useRef, type MutableRefObject } from 'react';
import {
	createBloomWebGLContext,
	type ShieldDistortion,
	type SingularityDistortion,
	type SplitDistortion,
	WebGLBloomPipeline,
} from '../effects/bloom';
import { EffectEngine } from '../effects/engine';
import { GAME_EFFECT_IDS, gameEffects } from '../effects/game-effects';
import { drawSignalBody, drawSignalShield, hexToRgb } from '../signals/visuals/canvas';
import { drawSuppressionLink, drawSuppressionSource } from '../signals/visuals/suppression';
import { drawTowerBody } from '../game/tower-visuals';
import type { SignalId } from '@prism-bastion/game-core/game/types';
import { drawProjectileGlow } from '../module-presentations/render-utils';
import {
	getSignalCapability,
	signalRegistry,
	type ShieldCapability,
	type SignalArchiveDemoMode,
	type SignalDefinition,
	type SplitOnDeathCapability,
	type TowerSuppressionCapability,
} from '@prism-bastion/game-core/signals';
import {
	advanceArchiveShieldCycle,
	archiveShieldProjectileProgress,
	createArchiveShieldCycle,
} from '../signals/archive/specimen-cycle';
import './SignalSpecimen.css';

const PREVIEW_WORLD_SIZE = 280;
const NO_SINGULARITIES: readonly SingularityDistortion[] = [];
const NO_SHIELDS: readonly ShieldDistortion[] = [];
const SUPPRESSION_SOURCE = { x: -48, y: -18 } as const;
const SUPPRESSION_TARGET = { x: 58, y: 20 } as const;

function drawArchiveField(ctx: CanvasRenderingContext2D, width: number, height: number, color: string): void {
	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = '#fbfafe';
	ctx.fillRect(0, 0, width, height);

	ctx.strokeStyle = `${color}0d`;
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (let x = 0.5; x < width; x += 24) {
		ctx.moveTo(x, 0);
		ctx.lineTo(x, height);
	}
	for (let y = 0.5; y < height; y += 24) {
		ctx.moveTo(0, y);
		ctx.lineTo(width, y);
	}
	ctx.stroke();

	const centerX = width / 2;
	const centerY = height / 2;
	const glowRadius = Math.min(width, height) * 0.5;
	const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
	glow.addColorStop(0, `${color}1f`);
	glow.addColorStop(1, `${color}00`);
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, width, height);

	ctx.strokeStyle = `${color}47`;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(centerX, height * 0.12);
	ctx.lineTo(centerX, height * 0.88);
	ctx.moveTo(width * 0.12, centerY);
	ctx.lineTo(width * 0.88, centerY);
	ctx.stroke();
}

function drawShieldProjectile(
	ctx: CanvasRenderingContext2D,
	bloomCtx: CanvasRenderingContext2D | undefined,
	progress: number,
	shieldRadius: number,
): void {
	const startX = -132;
	const startY = -24;
	const targetX = -shieldRadius * Math.cos(Math.PI / 6) - 3;
	const targetY = 0;
	const x = startX + (targetX - startX) * progress;
	const y = startY + (targetY - startY) * progress;
	const angle = Math.atan2(targetY - startY, targetX - startX);
	const color = '#6c5ce7';

	ctx.save();
	ctx.fillStyle = color;
	for (let index = 5; index >= 1; index -= 1) {
		const distance = index * 5;
		ctx.globalAlpha = (1 - index / 6) * 0.24;
		ctx.beginPath();
		ctx.arc(
			x - Math.cos(angle) * distance,
			y - Math.sin(angle) * distance,
			Math.max(1.2, 4.8 - index * 0.55),
			0,
			Math.PI * 2,
		);
		ctx.fill();
	}
	ctx.restore();
	drawProjectileGlow(ctx, x, y, 4.8, color);
	if (bloomCtx) {
		drawProjectileGlow(bloomCtx, x, y, 5.6, color);
	}
}

interface PreviewState {
	type: SignalId;
	demoMode: SignalArchiveDemoMode | undefined;
}

class SignalSpecimenRenderer {
	private animationFrame = 0;
	private elapsed = 0;
	private lastTime = performance.now();
	private renderWidth = 0;
	private renderHeight = 0;
	private renderScale = 0;
	private fieldColor = '';
	private activeType: SignalId;
	private activeDemoMode: SignalArchiveDemoMode | undefined;
	private definition: SignalDefinition<SignalId>;
	private shield: ShieldCapability | undefined;
	private split: SplitOnDeathCapability | undefined;
	private aura: TowerSuppressionCapability | undefined;
	private shieldCycle = createArchiveShieldCycle();
	private shieldColor: ReturnType<typeof hexToRgb> | null;
	private readonly effects = new EffectEngine().registerMany(gameEffects);
	private readonly shieldVisualState = { charge: 1, radiusScale: 1, hitStrength: 0 };
	private readonly shieldDistortion: ShieldDistortion = {
		centerX: 0,
		centerY: 0,
		radius: 0,
		radiusScale: 1,
		active: true,
		sides: 6,
		rotation: 0,
		hitStrength: 0,
		color: [0.27, 0.72, 1],
		rippleAge: Number.POSITIVE_INFINITY,
		time: 0,
	};
	private readonly splitDistortion: SplitDistortion = {
		centerX: 0,
		centerY: 0,
		radius: 0,
		phase: 0,
		color: hexToRgb('#73e7f2'),
	};
	private readonly signalBodyOptions;
	private readonly towerVisualOptions = {
		color: '#6c5ce7',
		energyRatio: 0.5,
		level: 1,
		rotation: 0,
		programHasProjectile: true,
	};

	constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly scene: HTMLCanvasElement,
		private readonly sceneCtx: CanvasRenderingContext2D,
		private readonly field: HTMLCanvasElement,
		private readonly fieldCtx: CanvasRenderingContext2D,
		private readonly pipeline: WebGLBloomPipeline | null,
		private readonly fallbackCtx: CanvasRenderingContext2D | null,
		private readonly previewStateRef: MutableRefObject<PreviewState>,
	) {
		this.activeType = previewStateRef.current.type;
		this.activeDemoMode = previewStateRef.current.demoMode;
		this.definition = signalRegistry.require(this.activeType);
		this.shield = getSignalCapability(this.definition, 'shield');
		this.split = getSignalCapability(this.definition, 'split-on-death');
		this.aura = getSignalCapability(this.definition, 'tower-suppression-aura');
		this.shieldColor = this.shield ? hexToRgb(this.shield.color) : null;
		this.signalBodyOptions = { type: this.activeType, time: 0, radius: this.definition.stats.radius, phase: 0 };
		this.spawnFractureEffect();
	}

	start(): void {
		this.animationFrame = requestAnimationFrame(this.draw);
	}

	stop(): void {
		cancelAnimationFrame(this.animationFrame);
		this.effects.clear();
		this.pipeline?.dispose();
	}

	private readonly draw = (now: number): void => {
		this.syncPreviewState();
		const delta = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
		this.lastTime = now;
		this.elapsed += delta;
		this.effects.update(delta);
		this.updateCrownShield(delta);
		const cssWidth = this.canvas.clientWidth;
		const cssHeight = this.canvas.clientHeight;
		const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
		this.resize(cssWidth, cssHeight, deviceScale);
		this.drawField();
		const centerX = cssWidth / 2;
		const centerY = cssHeight / 2;
		const worldScale = Math.min(cssWidth, cssHeight) / PREVIEW_WORLD_SIZE;
		this.prepareScene(deviceScale, centerX, centerY, worldScale);
		const bloomCtx = this.pipeline?.beginFrame(centerX, centerY, worldScale);
		this.drawScene(bloomCtx);
		this.composite(cssHeight, centerX, centerY, worldScale, deviceScale);
		this.animationFrame = requestAnimationFrame(this.draw);
	};

	private syncPreviewState(): void {
		const next = this.previewStateRef.current;
		if (next.type === this.activeType && next.demoMode?.id === this.activeDemoMode?.id) {
			return;
		}
		this.activeType = next.type;
		this.activeDemoMode = next.demoMode;
		this.definition = signalRegistry.require(this.activeType);
		this.shield = getSignalCapability(this.definition, 'shield');
		this.split = getSignalCapability(this.definition, 'split-on-death');
		this.aura = getSignalCapability(this.definition, 'tower-suppression-aura');
		this.shieldColor = this.shield ? hexToRgb(this.shield.color) : null;
		this.shieldCycle = createArchiveShieldCycle();
		this.elapsed = 0;
		this.lastTime = performance.now();
		this.fieldColor = '';
		this.effects.clear();
		this.spawnFractureEffect();
	}

	private spawnFractureEffect(): void {
		if (this.activeDemoMode?.specimen.kind !== 'split-result' || !this.split) {
			return;
		}
		this.effects.spawn(GAME_EFFECT_IDS.fractureSplitRipple, {
			position: { x: 0, y: 0 },
			color: this.split.effectColor,
		});
	}

	private updateCrownShield(delta: number): void {
		if (!this.shield) {
			return;
		}
		const event = advanceArchiveShieldCycle(this.shieldCycle, delta);
		if (!event) {
			return;
		}
		const ids = {
			hit: GAME_EFFECT_IDS.shieldHit,
			break: GAME_EFFECT_IDS.shieldBreak,
			restore: GAME_EFFECT_IDS.shieldRestore,
		} as const;
		this.effects.spawn(ids[event], {
			position: { x: 0, y: 0 },
			rotation: this.shield.rotation,
			color: this.shield.color,
			data: { radius: this.shield.radius, sides: this.shield.sides },
		});
	}

	private resize(width: number, height: number, scale: number): void {
		if (width === this.renderWidth && height === this.renderHeight && scale === this.renderScale) {
			return;
		}
		this.renderWidth = width;
		this.renderHeight = height;
		this.renderScale = scale;
		if (this.pipeline) {
			this.pipeline.resize(width, height, scale);
		} else {
			this.canvas.width = Math.max(1, Math.round(width * scale));
			this.canvas.height = Math.max(1, Math.round(height * scale));
		}
		this.scene.width = this.canvas.width;
		this.scene.height = this.canvas.height;
		this.field.width = this.scene.width;
		this.field.height = this.scene.height;
		this.fieldColor = '';
	}

	private drawField(): void {
		if (this.fieldColor === this.definition.visual.color) {
			return;
		}
		this.fieldCtx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
		drawArchiveField(this.fieldCtx, this.renderWidth, this.renderHeight, this.definition.visual.color);
		this.fieldColor = this.definition.visual.color;
	}

	private prepareScene(scale: number, centerX: number, centerY: number, worldScale: number): void {
		this.sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
		this.sceneCtx.drawImage(this.field, 0, 0);
		this.sceneCtx.setTransform(scale, 0, 0, scale, 0, 0);
		this.sceneCtx.save();
		this.sceneCtx.translate(centerX, centerY);
		this.sceneCtx.scale(worldScale, worldScale);
	}

	private drawScene(bloomCtx: CanvasRenderingContext2D | undefined): void {
		this.effects.render(this.sceneCtx, 'ground', bloomCtx);
		this.effects.render(this.sceneCtx, 'under-projectile', bloomCtx);
		this.effects.render(this.sceneCtx, 'projectile', bloomCtx);
		const showingSuppression = this.activeDemoMode?.specimen.kind === 'tower-under-aura' && Boolean(this.aura);
		this.drawSuppressedTower(showingSuppression, bloomCtx);
		this.drawShieldProjectile(bloomCtx);
		this.drawSignals(showingSuppression);
		this.drawShield();
		this.drawSuppressionLink(showingSuppression, bloomCtx);
		this.effects.render(this.sceneCtx, 'air', bloomCtx);
		this.effects.render(this.sceneCtx, 'overlay', bloomCtx);
		this.sceneCtx.restore();
	}

	private drawSuppressedTower(showing: boolean, bloomCtx: CanvasRenderingContext2D | undefined): void {
		if (!showing || !this.aura) {
			return;
		}
		drawSuppressionSource(
			this.sceneCtx,
			SUPPRESSION_SOURCE,
			this.definition.stats.radius,
			this.aura,
			this.elapsed,
			7,
			false,
		);
		if (bloomCtx) {
			drawSuppressionSource(
				bloomCtx,
				SUPPRESSION_SOURCE,
				this.definition.stats.radius,
				this.aura,
				this.elapsed,
				7,
				true,
			);
		}
		this.sceneCtx.save();
		this.sceneCtx.translate(SUPPRESSION_TARGET.x, SUPPRESSION_TARGET.y);
		this.towerVisualOptions.energyRatio = 0.5 + Math.sin(this.elapsed * 0.7) * 0.035;
		this.towerVisualOptions.rotation = Math.atan2(
			SUPPRESSION_SOURCE.y - SUPPRESSION_TARGET.y,
			SUPPRESSION_SOURCE.x - SUPPRESSION_TARGET.x,
		);
		drawTowerBody(this.sceneCtx, this.towerVisualOptions);
		this.sceneCtx.restore();
	}

	private drawShieldProjectile(bloomCtx: CanvasRenderingContext2D | undefined): void {
		const progress = this.shield ? archiveShieldProjectileProgress(this.shieldCycle) : null;
		const visible = progress === null ? 'false' : 'true';
		if (this.canvas.dataset.projectileVisible !== visible) {
			this.canvas.dataset.projectileVisible = visible;
		}
		if (progress !== null && this.shield) {
			drawShieldProjectile(this.sceneCtx, bloomCtx, progress, this.shield.radius * this.shieldCycle.radiusScale);
		}
	}

	private drawSignals(showingSuppression: boolean): void {
		this.signalBodyOptions.type = this.activeType;
		this.signalBodyOptions.time = this.elapsed;
		if (this.activeDemoMode?.specimen.kind === 'split-result' && this.split) {
			this.drawSplitSignals();
			return;
		}
		this.sceneCtx.save();
		if (showingSuppression) {
			this.sceneCtx.translate(SUPPRESSION_SOURCE.x, SUPPRESSION_SOURCE.y);
		}
		this.signalBodyOptions.radius = this.definition.stats.radius;
		this.signalBodyOptions.phase = 0;
		drawSignalBody(this.sceneCtx, this.signalBodyOptions);
		this.sceneCtx.restore();
	}

	private drawSplitSignals(): void {
		if (!this.split || this.elapsed < this.split.delay) {
			return;
		}
		this.signalBodyOptions.radius = this.definition.stats.radius * this.split.radiusScale;
		for (let index = 0; index < this.split.count; index += 1) {
			const offset = index - (this.split.count - 1) / 2;
			this.sceneCtx.save();
			this.sceneCtx.translate(offset * 34, Math.abs(offset) * 11);
			this.signalBodyOptions.phase = index * 1.7;
			drawSignalBody(this.sceneCtx, this.signalBodyOptions);
			this.sceneCtx.restore();
		}
	}

	private drawShield(): void {
		if (!this.shield) {
			return;
		}
		this.shieldVisualState.charge = this.shieldCycle.active ? 1 : 0;
		this.shieldVisualState.radiusScale = this.shieldCycle.radiusScale;
		this.shieldVisualState.hitStrength = this.shieldCycle.hitStrength;
		drawSignalShield(this.sceneCtx, this.shield, this.shieldVisualState);
	}

	private drawSuppressionLink(showing: boolean, bloomCtx: CanvasRenderingContext2D | undefined): void {
		if (!showing || !this.aura) {
			return;
		}
		drawSuppressionLink(
			this.sceneCtx,
			SUPPRESSION_SOURCE,
			SUPPRESSION_TARGET,
			this.aura,
			this.elapsed,
			7,
			1,
			false,
		);
		if (bloomCtx) {
			drawSuppressionLink(bloomCtx, SUPPRESSION_SOURCE, SUPPRESSION_TARGET, this.aura, this.elapsed, 7, 1, true);
		}
	}

	private composite(
		cssHeight: number,
		centerX: number,
		centerY: number,
		worldScale: number,
		deviceScale: number,
	): void {
		if (!this.pipeline) {
			this.fallbackCtx?.setTransform(1, 0, 0, 1, 0, 0);
			this.fallbackCtx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.fallbackCtx?.drawImage(this.scene, 0, 0);
			return;
		}
		this.updateShieldDistortion(cssHeight, centerX, centerY, worldScale, deviceScale);
		const splitActive =
			this.activeDemoMode?.specimen.kind === 'split-result' &&
			this.split !== undefined &&
			this.elapsed < this.split.rippleDuration;
		if (splitActive && this.split) {
			this.splitDistortion.centerX = centerX * deviceScale;
			this.splitDistortion.centerY = (cssHeight - centerY) * deviceScale;
			this.splitDistortion.radius = 120 * worldScale * deviceScale;
			this.splitDistortion.phase = this.elapsed / this.split.rippleDuration;
		}
		this.pipeline.render(
			this.scene,
			this.shield ? [this.shieldDistortion] : NO_SHIELDS,
			splitActive ? this.splitDistortion : null,
			NO_SINGULARITIES,
			this.elapsed,
		);
	}

	private updateShieldDistortion(
		cssHeight: number,
		centerX: number,
		centerY: number,
		worldScale: number,
		deviceScale: number,
	): void {
		if (!this.shield || !this.shieldColor) {
			return;
		}
		Object.assign(this.shieldDistortion, {
			centerX: centerX * deviceScale,
			centerY: (cssHeight - centerY) * deviceScale,
			radius: this.shield.radius * worldScale * deviceScale,
			radiusScale: this.shieldCycle.radiusScale,
			active: this.shieldCycle.active,
			sides: this.shield.sides,
			rotation: -this.shield.rotation,
			hitStrength: this.shieldCycle.hitStrength,
			color: this.shieldColor,
			rippleAge: this.shieldCycle.rippleAge,
			time: this.elapsed,
		});
	}
}

const createRenderer = (
	canvas: HTMLCanvasElement,
	state: MutableRefObject<PreviewState>,
): SignalSpecimenRenderer | null => {
	const scene = document.createElement('canvas');
	const sceneCtx = scene.getContext('2d', { alpha: true });
	const field = document.createElement('canvas');
	const fieldCtx = field.getContext('2d', { alpha: false });
	if (!sceneCtx || !fieldCtx) {
		return null;
	}
	const gl = createBloomWebGLContext(canvas);
	const pipeline = gl ? new WebGLBloomPipeline(canvas, gl) : null;
	const fallbackCtx = pipeline ? null : canvas.getContext('2d');
	return pipeline || fallbackCtx
		? new SignalSpecimenRenderer(canvas, scene, sceneCtx, field, fieldCtx, pipeline, fallbackCtx, state)
		: null;
};

export function SignalSpecimen({
	type,
	label,
	demoMode,
}: {
	type: SignalId;
	label: string;
	demoMode: SignalArchiveDemoMode | undefined;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const previewStateRef = useRef<PreviewState>({ type, demoMode });
	previewStateRef.current = { type, demoMode };
	useEffect(() => {
		const renderer = canvasRef.current ? createRenderer(canvasRef.current, previewStateRef) : null;
		renderer?.start();
		return () => renderer?.stop();
	}, []);
	return (
		<canvas
			ref={canvasRef}
			width="640"
			height="640"
			className="signal-archive-specimen"
			role="img"
			aria-label={label}
			data-specimen-count={
				demoMode?.specimen.kind === 'split-result'
					? String(getSignalCapability(signalRegistry.require(type), 'split-on-death')?.count ?? 1)
					: '1'
			}
			data-has-shield={getSignalCapability(signalRegistry.require(type), 'shield') ? 'true' : 'false'}
			data-suppressed-tower={demoMode?.specimen.kind === 'tower-under-aura' ? 'true' : 'false'}
		/>
	);
}
