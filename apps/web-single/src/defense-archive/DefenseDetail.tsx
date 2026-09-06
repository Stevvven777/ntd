import type { SignalVariantId } from '@prism-bastion/game-core/game/types';
import { difficultyName, levelName } from '@prism-bastion/web-shared/i18n/presentation';
import { SignalIcon } from '@prism-bastion/web-shared/ui/SignalIcon';
import { signalIconType, signalLabel } from '@prism-bastion/web-shared/ui/SignalLedger';
import { UiIcon } from '@prism-bastion/web-shared/ui/UiIcon';
import { useTranslation } from 'react-i18next';
import { ArchiveModule } from './ArchiveModule';
import { formatDuration } from './presentation';
import type { DefenseRecord } from './types';
import styles from '../DefenseArchive.module.css';

export function DefenseDetail({ record, onClose }: { record: DefenseRecord; onClose: () => void }) {
	const { t } = useTranslation();
	const wallSeconds = (record.endedAt - record.startedAt) / 1000;
	return (
		<article className={styles['defense-detail']} data-defense-detail data-result={record.result}>
			<header>
				<div>
					<span>{new Date(record.endedAt).toLocaleString()}</span>
					<h2>{levelName(t, record.levelId)}</h2>
				</div>
				<button onClick={onClose} aria-label={t('defenseArchive.closeDetail')}>
					<UiIcon name="close" />
				</button>
			</header>
			<div className={styles['defense-result-line']}>
				<strong>{t(`defenseArchive.result.${record.result}`)}</strong>
				<span>
					{difficultyName(t, record.difficultyId)} · {record.waveReached}/{record.maxWaves}
				</span>
			</div>
			<dl className={styles['defense-facts']}>
				<div>
					<dt>{t('defenseArchive.detail.core')}</dt>
					<dd>
						{record.core}/{record.maxCore}
					</dd>
				</div>
				<div>
					<dt>{t('defenseArchive.detail.score')}</dt>
					<dd>{record.score}</dd>
				</div>
				<div>
					<dt>{t('defenseArchive.detail.duration')}</dt>
					<dd>{formatDuration(wallSeconds)}</dd>
				</div>
				<div>
					<dt>{t('defenseArchive.detail.simulation')}</dt>
					<dd>{formatDuration(record.simulationSeconds)}</dd>
				</div>
				<div>
					<dt>{t('defenseArchive.detail.version')}</dt>
					<dd>
						{record.build.commit} · {record.build.commitDate}
					</dd>
				</div>
			</dl>
			<section>
				<h3>{t('defenseArchive.detail.waves')}</h3>
				<div className={styles['defense-archive-table-scroll']}>
					<table className={styles['wave-table']}>
						<thead>
							<tr>
								<th>{t('defenseArchive.column.wave')}</th>
								<th>{t('defenseArchive.column.signal')}</th>
								<th>{t('defenseArchive.column.spawned')}</th>
								<th>{t('defenseArchive.column.defeated')}</th>
								<th>{t('defenseArchive.column.leaked')}</th>
								<th>{t('defenseArchive.column.remaining')}</th>
							</tr>
						</thead>
						<tbody>
							{record.waves.flatMap((wave) =>
								Object.entries(wave.signals).map(([variant, tally]) => (
									<tr key={`${wave.wave}-${variant}`}>
										<td>{wave.wave}</td>
										<th>
											<span className={styles['defense-wave-signal']}>
												<SignalIcon type={signalIconType(variant as SignalVariantId)} />
												{signalLabel(t, variant as SignalVariantId)}
											</span>
										</th>
										<td>
											{tally?.spawned ?? 0}
											{(tally?.queued ?? 0) > 0 ? (
												<small>
													{' '}
													+{tally?.queued} {t('defenseArchive.short.queued')}
												</small>
											) : null}
										</td>
										<td>{tally?.defeated ?? 0}</td>
										<td>{tally?.leaked ?? 0}</td>
										<td>{tally?.remaining ?? 0}</td>
									</tr>
								)),
							)}
						</tbody>
					</table>
				</div>
			</section>
			<section>
				<h3>{t('defenseArchive.detail.inventory')}</h3>
				<div className={styles['inventory-ledger']} data-defense-inventory>
					{record.inventory.map((entry) => (
						<ArchiveModule key={entry.moduleId} moduleId={entry.moduleId} count={entry.count} />
					))}
				</div>
			</section>
			<section>
				<h3>{t('defenseArchive.detail.towers')}</h3>
				<div className={styles['tower-records']}>
					{record.towers.map((tower, index) => (
						<article key={tower.padIndex}>
							<header>
								<strong>{t('defenseArchive.detail.tower', { number: index + 1 })}</strong>
								<span>
									Lv.{tower.level} · {t(`tower.target.${tower.targeting}`)}
								</span>
							</header>
							<ol>
								{tower.slots.map((moduleId, slot) => (
									<li key={slot}>
										<small>{String(slot + 1).padStart(2, '0')}</small>
										{moduleId ? (
											<ArchiveModule moduleId={moduleId} />
										) : (
											<span className={styles['archive-module-empty']}>
												{t('defenseArchive.detail.emptySlot')}
											</span>
										)}
									</li>
								))}
							</ol>
						</article>
					))}
				</div>
			</section>
		</article>
	);
}
