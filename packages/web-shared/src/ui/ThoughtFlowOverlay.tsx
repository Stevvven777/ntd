import { useId, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThoughtSceneDirector } from '../thoughts';
import type { ThoughtPlayerSnapshot } from '../thoughts/types';
import styles from './ThoughtFlowOverlay.module.css';
import { ThoughtLoadouts } from './thought-overlay/ThoughtLoadouts';
import { useThoughtOverlayLayout } from './thought-overlay/useThoughtOverlayLayout';

export function ThoughtFlowOverlay({
	director,
	snapshot,
}: {
	director: ThoughtSceneDirector;
	snapshot: ThoughtPlayerSnapshot;
}) {
	const { t } = useTranslation();
	const overlay = snapshot.overlay;
	const {
		rootRef,
		calloutRef,
		line,
		calloutPosition,
		loadoutPositions,
		compactPositions,
		placementBurstPosition,
		registerDialog,
		registerCompact,
	} = useThoughtOverlayLayout(director, snapshot, t);
	const maskId = `thought-line-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-${snapshot.cueId}`;
	const cueStyle = { '--cue-duration': `${Math.max(0.7, snapshot.cueDuration)}s` } as CSSProperties;

	return (
		<div
			ref={rootRef}
			className={styles['thought-scene-overlay']}
			data-thought-scene-overlay
			data-cue={snapshot.cueId}
			style={cueStyle}
		>
			{snapshot.placementBurst ? (
				<div
					className={styles['thought-placement-burst']}
					style={placementBurstPosition ?? undefined}
					aria-hidden="true"
				>
					{Array.from({ length: 10 }, (_, index) => (
						<i key={index} style={{ '--particle-index': index } as CSSProperties} />
					))}
				</div>
			) : null}

			<ThoughtLoadouts
				director={director}
				snapshot={snapshot}
				dialogPositions={loadoutPositions}
				compactPositions={compactPositions}
				registerDialog={registerDialog}
				registerCompact={registerCompact}
			/>

			{line ? (
				<svg
					key={`line-${snapshot.cueId}`}
					className={styles['thought-overlay-line']}
					viewBox={`0 0 ${line.width} ${line.height}`}
					aria-hidden="true"
				>
					<defs>
						<mask
							id={maskId}
							maskUnits="userSpaceOnUse"
							maskContentUnits="userSpaceOnUse"
							x="0"
							y="0"
							width={line.width}
							height={line.height}
						>
							<rect width={line.width} height={line.height} fill="#000" />
							<path className={styles['thought-line-reveal']} d={line.path} pathLength="1" />
						</mask>
					</defs>
					<path className={styles['thought-line-dashes']} d={line.path} mask={`url(#${maskId})`} />
					<rect
						className={styles['thought-line-target']}
						x={line.target[0] - 6}
						y={line.target[1] - 6}
						width="12"
						height="12"
						rx="1"
					/>
				</svg>
			) : null}

			{overlay?.type === 'caption' ? (
				<section
					ref={calloutRef}
					key={`caption-${snapshot.cueId}`}
					className={styles['thought-scene-callout']}
					style={calloutPosition ?? undefined}
					aria-live="polite"
				>
					<p>{t(overlay.textKey)}</p>
					{snapshot.comparisonKey ? <strong>{t(snapshot.comparisonKey)}</strong> : null}
				</section>
			) : null}

			{snapshot.error ? (
				<section className={`${styles['thought-scene-callout']} ${styles['thought-scene-error']}`} role="alert">
					<p>{t('thoughtIndex.sceneError')}</p>
				</section>
			) : null}
		</div>
	);
}
