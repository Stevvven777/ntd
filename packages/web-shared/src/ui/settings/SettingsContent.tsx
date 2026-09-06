import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BUILD_COMMIT, BUILD_COMMIT_DATE } from '../../build-info';
import { defaultLanguage, supportedLanguages, type SupportedLanguage } from '../../i18n';
import { KeybindingSettings } from '../KeybindingSettings';
import { setAutoPauseEnabled, useAutoPauseEnabled } from '../preferences';
import { UiIcon } from '../UiIcon';
import styles from '../SettingsPanel.module.css';
import type { SettingsArchiveRepository } from './types';

export type SettingsCategory = 'general' | 'controls' | 'storage' | 'info';
type ClearState = 'idle' | 'armed' | 'clearing' | 'cleared' | 'error';

function GeneralSettings() {
	const { t, i18n } = useTranslation();
	const autoPauseEnabled = useAutoPauseEnabled();
	const language = supportedLanguages.find((option) => option === i18n.resolvedLanguage) ?? defaultLanguage;
	const chooseLanguage = (option: SupportedLanguage): void => {
		void i18n.changeLanguage(option);
	};
	return (
		<>
			<section className={styles['settings-section']}>
				<div className={styles['settings-section-copy']}>
					<strong>{t('common.language')}</strong>
					<span>{t('settings.languageDescription')}</span>
				</div>
				<div className={styles['language-options']}>
					{supportedLanguages.map((option) => (
						<button
							key={option}
							type="button"
							aria-pressed={option === language}
							onClick={() => chooseLanguage(option)}
						>
							<span aria-hidden="true">{i18n.getFixedT(option)('settings.languageIcon')}</span>
							<b>{i18n.getFixedT(option)('lang.name')}</b>
							<i aria-hidden="true">{option === language ? '✓' : ''}</i>
						</button>
					))}
				</div>
			</section>
			<section className={`${styles['settings-section']} ${styles['settings-auto-pause-section']}`}>
				<div className={styles['settings-section-copy']}>
					<strong>{t('settings.autoPauseTitle')}</strong>
				</div>
				<div className={styles['auto-pause-options']} role="group" aria-label={t('settings.autoPauseTitle')}>
					{[true, false].map((enabled) => (
						<button
							key={String(enabled)}
							type="button"
							aria-pressed={enabled === autoPauseEnabled}
							onClick={() => setAutoPauseEnabled(enabled)}
						>
							<span aria-hidden="true">
								<UiIcon name={enabled ? 'pause' : 'play'} />
							</span>
							<b>{t(enabled ? 'settings.autoPauseEnabled' : 'settings.autoPauseDisabled')}</b>
							<i aria-hidden="true">{enabled === autoPauseEnabled ? '✓' : ''}</i>
						</button>
					))}
				</div>
			</section>
		</>
	);
}

function InfoSettings() {
	const { t } = useTranslation();
	return (
		<section className={styles['settings-info']}>
			<header>
				<strong>{t('levelSelect.gameTitle')}</strong>
				<span>{t('levelSelect.version', { date: BUILD_COMMIT_DATE })}</span>
			</header>
			<a href={`https://github.com/szdytom/ntd/commit/${BUILD_COMMIT}`} target="_blank" rel="noreferrer">
				<code>{BUILD_COMMIT}</code>
				<span aria-hidden="true">
					<UiIcon name="external" />
				</span>
			</a>
			<a href="https://github.com/szdytom/ntd" target="_blank" rel="noreferrer">
				{t('levelSelect.projectOpenSource')}
				<span aria-hidden="true">
					<UiIcon name="external" />
				</span>
			</a>
			<a href="https://github.com/szdytom/ntd" target="_blank" rel="noreferrer">
				{t('levelSelect.starRequest')}
				<span aria-hidden="true">
					<UiIcon name="star" />
				</span>
			</a>
		</section>
	);
}

const clearButtonKey = (state: ClearState): string => {
	switch (state) {
		case 'armed':
			return 'settings.clearDefenseArchiveAgain';
		case 'clearing':
			return 'settings.clearingDefenseArchive';
		case 'cleared':
			return 'settings.defenseArchiveCleared';
		default:
			return 'defenseArchive.clear';
	}
};

const clearStatusText = (state: ClearState, t: ReturnType<typeof useTranslation>['t']): string => {
	if (state === 'armed') {
		return t('settings.clearDefenseArchiveWarning');
	}
	if (state === 'error') {
		return t('settings.clearDefenseArchiveError');
	}
	return '';
};

function StorageSettings({
	repository,
	onCleared,
}: {
	repository: SettingsArchiveRepository;
	onCleared: (() => void) | undefined;
}) {
	const { t } = useTranslation();
	const [state, setState] = useState<ClearState>('idle');
	useEffect(() => {
		if (state !== 'armed') {
			return;
		}
		const timeout = window.setTimeout(() => setState('idle'), 5_000);
		return () => window.clearTimeout(timeout);
	}, [state]);
	const clear = (): void => {
		if (state !== 'armed') {
			setState('armed');
			return;
		}
		setState('clearing');
		void repository
			.clearAll()
			.then(() => {
				setState('cleared');
				onCleared?.();
			})
			.catch(() => setState('error'));
	};
	return (
		<section className={`${styles['settings-section']} ${styles['settings-storage-section']}`}>
			<div className={styles['settings-section-copy']}>
				<strong>{t('settings.defenseArchiveTitle')}</strong>
			</div>
			<div className={styles['settings-storage-action']}>
				<button
					type="button"
					className={state === 'armed' ? styles.armed : undefined}
					disabled={state === 'clearing' || state === 'cleared'}
					onClick={clear}
				>
					{t(clearButtonKey(state))}
				</button>
				<span role="status" aria-live="polite">
					{clearStatusText(state, t)}
				</span>
			</div>
		</section>
	);
}

export function SettingsContent({
	category,
	repository,
	onCleared,
}: {
	category: SettingsCategory;
	repository: SettingsArchiveRepository;
	onCleared: (() => void) | undefined;
}) {
	switch (category) {
		case 'general':
			return <GeneralSettings />;
		case 'controls':
			return <KeybindingSettings />;
		case 'storage':
			return <StorageSettings repository={repository} onCleared={onCleared} />;
		case 'info':
			return <InfoSettings />;
	}
}
