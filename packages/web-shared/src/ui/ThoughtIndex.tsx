import { getKeybindings, matchesKeybinding, shouldIgnoreGameShortcut } from './keybindings';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { kindLabel } from '../i18n/presentation';
import { thoughtRegistry, ThoughtSceneDirector, type ThoughtDefinition, type ThoughtPlayerSnapshot } from '../thoughts';
import type { ThoughtTimelineWaitMarker } from '../thoughts/director';
import { modulePresentationRegistry } from '../module-presentations';
import { matchesThoughtSearch } from '../thoughts/search';
import type { ThoughtChapter } from '../thoughts/types';
import { ArchiveHeader } from './ArchiveHeader';
import { navigateSelectionList } from './selectionListKeyboard';
import { navigatePageSelection, usePageArrowNavigation } from './usePageArrowNavigation';
import { ThoughtCanvas } from './ThoughtCanvas';
import { ThoughtFlowOverlay } from './ThoughtFlowOverlay';
import { moduleUiColor, moduleUiTint } from './modulePresentation';
import './ThoughtIndex.css';

const CHAPTERS: readonly ThoughtChapter[] = ['projectile', 'modifier', 'logic', 'trail', 'static'];

const playbackLabelKey = (status: string): string => {
	if (status === 'playing') {
		return 'thoughtIndex.pause';
	}
	return status === 'completed' ? 'thoughtIndex.replay' : 'thoughtIndex.play';
};

const progressClassName = (index: number, currentIndex: number): string => {
	if (index < currentIndex) {
		return 'complete';
	}
	return index === currentIndex ? 'current' : '';
};

function ThoughtRail({
	definitions,
	director,
	selectedId,
	query,
	onQuery,
	onSelect,
}: {
	definitions: readonly ThoughtDefinition[];
	director: ThoughtSceneDirector;
	selectedId: string;
	query: string;
	onQuery: (query: string) => void;
	onSelect: (id: string) => void;
}) {
	const { t, i18n } = useTranslation();
	const languageTag = i18n.resolvedLanguage ?? i18n.language;
	const visible = definitions.filter((candidate) => matchesThoughtSearch(candidate, query, languageTag, t));
	return (
		<aside className="thought-index-rail" aria-label={t('thoughtIndex.indexAria')}>
			<label className="thought-search">
				<span>{t('thoughtIndex.searchLabel')}</span>
				<input
					value={query}
					onChange={(event) => onQuery(event.currentTarget.value)}
					placeholder={t('thoughtIndex.searchPlaceholder')}
				/>
			</label>
			<div className="thought-records" onKeyDown={navigateSelectionList}>
				{CHAPTERS.map((chapter) => {
					const records = visible.filter((candidate) => candidate.chapter === chapter);
					if (records.length === 0) {
						return null;
					}
					return (
						<section key={chapter}>
							<h2>{kindLabel(t, chapter)}</h2>
							{records.map((candidate) => {
								const module = director.runtime.engine.modules.require(candidate.subject.moduleId);
								const RecordIcon = modulePresentationRegistry.require(module.id).icon;
								return (
									<button
										key={candidate.id}
										data-thought-id={candidate.id}
										className={`selection-option ${candidate.id === selectedId ? 'selected' : ''}`}
										style={
											{
												'--record-accent': moduleUiColor(module),
												'--record-tint': moduleUiTint(module),
											} as CSSProperties
										}
										aria-current={candidate.id === selectedId ? 'page' : undefined}
										onClick={() => onSelect(candidate.id)}
										onFocus={() => onSelect(candidate.id)}
									>
										<span className="thought-record-icon" aria-hidden="true">
											<RecordIcon />
										</span>
										<span className="thought-record-copy">
											<strong>{t(candidate.titleKey)}</strong>
											<small>{t(candidate.summaryKey)}</small>
										</span>
									</button>
								);
							})}
						</section>
					);
				})}
				{visible.length === 0 ? <p className="thought-empty">{t('thoughtIndex.noResults')}</p> : null}
			</div>
		</aside>
	);
}

const waitMarkerPassed = (
	marker: ThoughtTimelineWaitMarker,
	snapshot: ThoughtPlayerSnapshot,
	definition: ThoughtDefinition,
): boolean => {
	if (snapshot.status === 'completed' || marker.beatIndex < snapshot.beatIndex) {
		return true;
	}
	if (marker.beatIndex > snapshot.beatIndex) {
		return false;
	}
	const cues = definition.beats[marker.beatIndex]?.cues ?? [];
	const currentCueIndex = cues.findIndex((cue) => cue.id === snapshot.cueId);
	const finalWaitCueIndex = Math.max(...marker.cueIds.map((cueId) => cues.findIndex((cue) => cue.id === cueId)));
	return currentCueIndex > finalWaitCueIndex;
};

function ThoughtStage({
	director,
	definition,
	snapshot,
	progressRef,
}: {
	director: ThoughtSceneDirector;
	definition: ThoughtDefinition;
	snapshot: ThoughtPlayerSnapshot;
	progressRef: RefObject<HTMLElement | null>;
}) {
	const { t } = useTranslation();
	const focalModule = director.runtime.engine.modules.require(definition.subject.moduleId);
	const FocalIcon = modulePresentationRegistry.require(focalModule.id).icon;
	const markers = director.getTimelineWaitMarkers();
	return (
		<article className="thought-stage" data-thought-id={definition.id}>
			<div className="thought-viewport">
				<div className="thought-scene-window">
					<ThoughtCanvas director={director} />
					<ThoughtFlowOverlay director={director} snapshot={snapshot} />
					<div
						className="thought-module-badge"
						style={
							{
								'--module-color': moduleUiColor(focalModule),
								'--module-tint': moduleUiTint(focalModule),
							} as CSSProperties
						}
					>
						<span>
							<FocalIcon />
						</span>
						<div>
							<small>
								{snapshot.sectionTitleKey ? t(definition.titleKey) : kindLabel(t, definition.chapter)}
							</small>
							<strong key={snapshot.sectionTitleKey ?? definition.titleKey}>
								{t(snapshot.sectionTitleKey ?? definition.titleKey)}
							</strong>
						</div>
					</div>
				</div>
			</div>
			<section className="thought-narration">
				<div className="thought-controls" aria-label={t('thoughtIndex.controlsAria')}>
					<button onClick={() => director.previous()} disabled={snapshot.beatIndex === 0}>
						{t('thoughtIndex.previous')}
					</button>
					<button className="thought-play" onClick={() => director.togglePlayback()}>
						{t(playbackLabelKey(snapshot.status))}
					</button>
					<button onClick={() => director.next()} disabled={snapshot.status === 'completed'}>
						{t('thoughtIndex.next')}
					</button>
				</div>
				<nav ref={progressRef} className="thought-progress" aria-label={t('thoughtIndex.progress')}>
					<i aria-hidden="true" />
					{definition.beats.map((beat, index) => (
						<button
							key={beat.id}
							className={progressClassName(index, snapshot.beatIndex)}
							style={{ flexGrow: beat.timelineDuration }}
							aria-current={index === snapshot.beatIndex ? 'step' : undefined}
							aria-label={t('thoughtIndex.step', { current: index + 1, total: definition.beats.length })}
							onClick={() => director.goTo(index)}
						/>
					))}
					{markers.map((marker) => (
						<span
							key={marker.id}
							className={`thought-progress-wait${waitMarkerPassed(marker, snapshot, definition) ? ' complete' : ''}${snapshot.status === 'playing' && marker.beatIndex === snapshot.beatIndex && marker.cueIds.includes(snapshot.cueId) ? ' waiting' : ''}`}
							style={{ left: `calc(${marker.progress * 100}% + ${16 - marker.progress * 32}px)` }}
							aria-hidden="true"
						>
							<i />
						</span>
					))}
					<span className="thought-progress-end" aria-hidden="true" />
				</nav>
			</section>
		</article>
	);
}

function ThoughtTranscript({ definition }: { definition: ThoughtDefinition }) {
	const { t } = useTranslation();
	const transcript = definition.beats.flatMap((beat) =>
		beat.cues
			? beat.cues.flatMap((cue) => [
					...(cue.sectionTitleKey ? [cue.sectionTitleKey] : []),
					...(cue.overlay?.type === 'caption' ? [cue.overlay.textKey] : []),
				])
			: [beat.captionKey],
	);
	return (
		<details className="thought-transcript">
			<summary>{t('thoughtIndex.transcript')}</summary>
			<ol>
				{transcript.map((textKey, index) => (
					<li key={`${textKey}-${index}`}>{t(textKey)}</li>
				))}
			</ol>
		</details>
	);
}

export function ThoughtIndex({
	initialThoughtId,
	onBack,
	backToBattlefield = false,
}: {
	initialThoughtId?: string;
	onBack: () => void;
	backToBattlefield?: boolean;
}) {
	const { t } = useTranslation();
	const definitions = thoughtRegistry.list();
	const [selectedId, setSelectedId] = useState(initialThoughtId ?? definitions[0]?.id ?? '');
	const [query, setQuery] = useState('');
	const definition = thoughtRegistry.require(selectedId);
	const director = useMemo(() => new ThoughtSceneDirector(definition), [definition]);
	const snapshot = useSyncExternalStore(director.subscribe, director.getSnapshot, director.getSnapshot);
	const focalModule = director.runtime.engine.modules.require(definition.subject.moduleId);
	const disposalTimers = useRef(new Map<ThoughtSceneDirector, ReturnType<typeof setTimeout>>());
	const autoPausedDirectors = useRef(new WeakSet<ThoughtSceneDirector>());
	const shellRef = usePageArrowNavigation((direction) =>
		navigatePageSelection(shellRef.current, '.thought-records button', direction),
	);
	const progressRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const timers = disposalTimers.current;
		const pending = timers.get(director);
		if (pending) {
			clearTimeout(pending);
			timers.delete(director);
		}
		return () => {
			const timer = setTimeout(() => {
				director.dispose();
				timers.delete(director);
			}, 0);
			timers.set(director, timer);
		};
	}, [director]);
	useEffect(() => {
		if (!initialThoughtId && !autoPausedDirectors.current.has(director)) {
			autoPausedDirectors.current.add(director);
			director.togglePlayback();
		}
	}, [director, initialThoughtId]);
	useEffect(() => {
		let frame = 0;
		const updateProgress = (): void => {
			progressRef.current?.style.setProperty('--timeline-progress', `${director.getTimelineProgress()}`);
			frame = requestAnimationFrame(updateProgress);
		};
		frame = requestAnimationFrame(updateProgress);
		return () => cancelAnimationFrame(frame);
	}, [director]);
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent): void => {
			if (shouldIgnoreGameShortcut(event)) {
				return;
			}
			const bindings = getKeybindings();
			if (event.key === 'Escape') {
				onBack();
			} else if (matchesKeybinding(event, bindings.thoughtPlayback)) {
				event.preventDefault();
				director.togglePlayback();
			} else if (matchesKeybinding(event, bindings.thoughtPrevious)) {
				event.preventDefault();
				director.previous();
			} else if (matchesKeybinding(event, bindings.thoughtNext)) {
				event.preventDefault();
				director.next();
			} else if (matchesKeybinding(event, bindings.thoughtRestart)) {
				event.preventDefault();
				director.restart();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [director, onBack]);

	return (
		<main
			ref={shellRef}
			className="thought-index-shell"
			style={{ '--thought-accent': moduleUiColor(focalModule) } as CSSProperties}
			tabIndex={-1}
			aria-label={t('thoughtIndex.title')}
		>
			<div className="thought-index-frame">
				<ArchiveHeader
					className="thought-index-header"
					title={t('thoughtIndex.title')}
					backLabel={backToBattlefield ? t('thoughtIndex.backBattlefield') : t('thoughtIndex.backMenu')}
					onBack={onBack}
					decoration={
						<div className="thought-index-seal" aria-hidden="true">
							<i />
							<i />
							<i />
						</div>
					}
					contained
				/>

				<ThoughtRail
					{...{ definitions, director, selectedId, query }}
					onQuery={setQuery}
					onSelect={setSelectedId}
				/>
				<ThoughtStage {...{ director, definition, snapshot, progressRef }} />
				<ThoughtTranscript definition={definition} />
			</div>
		</main>
	);
}
