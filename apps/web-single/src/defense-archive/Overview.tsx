import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SignalLedger } from '@prism-bastion/web-shared/ui/SignalLedger';
import { buildDefenseArchiveAnalytics } from './analytics';
import type { DefenseRecord } from './types';
import { formatDuration } from './presentation';
import styles from '../DefenseArchive.module.css';

export function DefenseArchiveOverview({ records }: { records: DefenseRecord[] }) {
	const { t } = useTranslation();
	const analytics = useMemo(() => buildDefenseArchiveAnalytics(records), [records]);
	const stats = analytics.aggregate;
	const metrics = [
		['defenses', stats.defenses],
		['winRate', `${Math.round(stats.winRate * 100)}%`],
		['defeated', stats.defeated],
		['leaked', stats.leaked],
		['duration', formatDuration(stats.durationSeconds)],
		['bestScore', stats.bestScore],
	] as const;
	return (
		<div className={styles['defense-archive-overview']}>
			<section
				className={styles['defense-archive-metrics']}
				aria-label={t('defenseArchive.overview.metricsAria')}
			>
				{metrics.map(([key, value], index) => (
					<div
						key={key}
						className={`${styles['defense-archive-metric']} ${styles[`metric-${index + 1}`]}`}
						data-defense-metric={key}
					>
						<span>{t(`defenseArchive.metric.${key}`)}</span>
						<strong>{value}</strong>
					</div>
				))}
			</section>
			<section className={`${styles['defense-archive-table-section']} signal-ledger`}>
				<header>
					<h2>{t('defenseArchive.signalStats')}</h2>
					<p>{t('defenseArchive.signalStatsDetail')}</p>
				</header>
				<SignalLedger signals={analytics.signals} includeUnobserved />
			</section>
		</div>
	);
}
