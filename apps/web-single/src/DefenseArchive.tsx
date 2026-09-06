import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArchiveHeader } from '@prism-bastion/web-shared/ui/ArchiveHeader';
import { navigatePageSelection, usePageArrowNavigation } from '@prism-bastion/web-shared/ui/usePageArrowNavigation';
import { SectorArchive } from './SectorArchive';
import type { DefenseArchiveRepository, DefenseArchiveSnapshot } from './defense-archive';
import { DefenseArchiveAchievements } from './defense-archive/DefenseArchiveAchievements';
import { DefenseArchiveHistory } from './defense-archive/History';
import { DefenseArchiveOverview } from './defense-archive/Overview';
import styles from './DefenseArchive.module.css';

type DefenseArchiveTab = 'overview' | 'sectors' | 'achievements' | 'history';
const archiveTabs: readonly DefenseArchiveTab[] = ['overview', 'sectors', 'achievements', 'history'];

const tabIndexForKey = (key: string, current: number): number => {
	if (key === 'Home') {
		return 0;
	}
	if (key === 'End') {
		return archiveTabs.length - 1;
	}
	if (key === 'ArrowRight') {
		return (current + 1) % archiveTabs.length;
	}
	if (key === 'ArrowLeft') {
		return (current - 1 + archiveTabs.length) % archiveTabs.length;
	}
	return -1;
};

function ArchiveTab({ tab, snapshot }: { tab: DefenseArchiveTab; snapshot: DefenseArchiveSnapshot }) {
	switch (tab) {
		case 'overview':
			return <DefenseArchiveOverview records={snapshot.defenses} />;
		case 'sectors':
			return <SectorArchive records={snapshot.defenses} />;
		case 'achievements':
			return <DefenseArchiveAchievements snapshot={snapshot} />;
		case 'history':
			return <DefenseArchiveHistory records={snapshot.defenses} />;
	}
}

export function DefenseArchive({ repository, onBack }: { repository: DefenseArchiveRepository; onBack: () => void }) {
	const { t } = useTranslation();
	const [tab, setTab] = useState<DefenseArchiveTab>('overview');
	const [snapshot, setSnapshot] = useState<DefenseArchiveSnapshot | null>(null);
	const [error, setError] = useState(false);
	const contentRef = useRef<HTMLElement>(null);
	const pageRef = usePageArrowNavigation((direction) =>
		navigatePageSelection(pageRef.current, `.${styles['defense-archive-tabs']!} [role="tab"]`, direction),
	);
	const load = useCallback((): void => {
		setError(false);
		void repository
			.readSnapshot()
			.then(setSnapshot)
			.catch(() => setError(true));
	}, [repository]);
	useEffect(load, [load]);
	useEffect(() => {
		if (contentRef.current) {
			contentRef.current.scrollTop = 0;
		}
	}, [tab]);
	const moveTabFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
		const nextIndex = tabIndexForKey(event.key, index);
		if (nextIndex < 0) {
			return;
		}
		event.preventDefault();
		setTab(archiveTabs[nextIndex]!);
		event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
	};
	let status = null;
	if (error) {
		status = (
			<div className={styles['defense-archive-empty']}>
				<strong>{t('defenseArchive.storageError')}</strong>
				<p>{t('defenseArchive.storageErrorDetail')}</p>
				<button onClick={load}>{t('defenseArchive.retry')}</button>
			</div>
		);
	} else if (!snapshot) {
		status = (
			<div className={styles['defense-archive-loading']}>
				<i />
				<span>{t('defenseArchive.loading')}</span>
			</div>
		);
	} else if (snapshot.warningCount > 0) {
		status = (
			<div className={styles['defense-archive-warning']}>
				{t('defenseArchive.corruptWarning', { count: snapshot.warningCount })}
			</div>
		);
	}

	return (
		<main ref={pageRef} tabIndex={-1} className={`archive-shell ${styles['defense-archive-shell']}`}>
			<div className={styles['defense-archive-frame']} data-defense-archive-frame>
				<ArchiveHeader
					className={styles['defense-archive-head']!}
					title={t('defenseArchive.title')}
					backLabel={t('defenseArchive.back')}
					onBack={onBack}
					decoration={
						<div className={styles['defense-archive-mark']} data-defense-archive-mark aria-hidden="true">
							<i />
							<i />
							<i />
						</div>
					}
					contained
					settings={{ defenseArchiveRepository: repository, onDefenseArchiveCleared: load }}
				/>
				<nav
					className={styles['defense-archive-tabs']}
					role="tablist"
					aria-label={t('defenseArchive.sections')}
				>
					{archiveTabs.map((item, index) => (
						<button
							key={item}
							id={`defense-archive-tab-${item}`}
							data-tab={item}
							role="tab"
							aria-controls="defense-archive-panel"
							aria-selected={tab === item}
							tabIndex={tab === item ? 0 : -1}
							onKeyDown={(event) => moveTabFocus(event, index)}
							onClick={() => setTab(item)}
						>
							<span>{t(`defenseArchive.tab.${item}`)}</span>
							{item === 'history' && snapshot ? <b>{snapshot.defenses.length}</b> : null}
						</button>
					))}
				</nav>
				<section
					ref={contentRef}
					id="defense-archive-panel"
					className={styles['defense-archive-content']}
					data-tab={tab}
					role="tabpanel"
					aria-labelledby={`defense-archive-tab-${tab}`}
					tabIndex={0}
				>
					{status}
					{!error && snapshot ? <ArchiveTab tab={tab} snapshot={snapshot} /> : null}
				</section>
				<footer className={styles['defense-archive-footer']}>
					<span>{t('defenseArchive.localOnly')}</span>
				</footer>
			</div>
		</main>
	);
}
