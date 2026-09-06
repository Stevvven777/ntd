import { UiIcon } from './UiIcon';
import { BUILD_COMMIT, BUILD_COMMIT_DATE } from '../build-info';
import { KeybindingSettings } from './KeybindingSettings';
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { defaultLanguage, supportedLanguages, type SupportedLanguage } from '../i18n';
import { setAutoPauseEnabled, useAutoPauseEnabled } from './preferences';
import './SettingsPanel.css';
import { SettingsGlyph } from './SettingsGlyph';

const settingsCategories = ['general', 'controls', 'storage', 'info'] as const;
type SettingsCategory = (typeof settingsCategories)[number];

export interface SettingsArchiveRepository {
	clearAll(): Promise<unknown>;
}
let settingsArchiveRepository: SettingsArchiveRepository = { clearAll: async () => undefined };
export const configureSettingsArchiveRepository = (repository: SettingsArchiveRepository): void => {
	settingsArchiveRepository = repository;
};

export function SettingsPanel({
	disabled = false,
	defenseArchiveRepository = settingsArchiveRepository,
	onDefenseArchiveCleared,
}: {
	disabled?: boolean;
	defenseArchiveRepository?: SettingsArchiveRepository;
	onDefenseArchiveCleared?: () => void;
}) {
	const { t, i18n } = useTranslation();
	const [open, setOpen] = useState(false);
	const [category, setCategory] = useState<SettingsCategory>('general');
	const panelId = useId();
	const contentRef = useRef<HTMLDivElement>(null);
	const autoPauseEnabled = useAutoPauseEnabled();
	const [clearState, setClearState] = useState<'idle' | 'armed' | 'clearing' | 'cleared' | 'error'>('idle');
	const triggerRef = useRef<HTMLButtonElement>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const language = supportedLanguages.find((option) => option === i18n.resolvedLanguage) ?? defaultLanguage;
	useEffect(() => {
		if (!open) {
			return;
		}
		dialogRef.current?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus();
		const closeOnEscape = (event: KeyboardEvent): void => {
			if (event.key === 'Tab') {
				const controls = Array.from(
					dialogRef.current?.querySelectorAll<HTMLElement>(
						'button:not(:disabled):not([tabindex="-1"]), a[href], [tabindex="0"]',
					) ?? [],
				);
				const first = controls[0];
				const last = controls[controls.length - 1];
				if (event.shiftKey && document.activeElement === first) {
					event.preventDefault();
					last?.focus();
				} else if (!event.shiftKey && document.activeElement === last) {
					event.preventDefault();
					first?.focus();
				}
				return;
			}
			if (event.key !== 'Escape') {
				return;
			}
			event.preventDefault();
			setOpen(false);
			setClearState('idle');
			triggerRef.current?.focus();
		};
		document.addEventListener('keydown', closeOnEscape);
		return () => document.removeEventListener('keydown', closeOnEscape);
	}, [open]);
	useEffect(() => {
		if (clearState !== 'armed') {
			return;
		}
		const timeout = window.setTimeout(() => setClearState('idle'), 5_000);
		return () => window.clearTimeout(timeout);
	}, [clearState]);

	const closeSettings = (): void => {
		setOpen(false);
		setClearState('idle');
		triggerRef.current?.focus();
	};

	const chooseCategory = (next: SettingsCategory): void => {
		setCategory(next);
		setClearState((current) => (current === 'armed' ? 'idle' : current));
		if (contentRef.current) {
			contentRef.current.scrollTop = 0;
		}
	};

	const navigateSettings = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
		if (
			event.defaultPrevented ||
			event.nativeEvent.isComposing ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			event.shiftKey
		) {
			return;
		}
		if (
			event.target instanceof Element &&
			event.target.closest('input, textarea, select, [contenteditable="true"]')
		) {
			return;
		}
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			const index = settingsCategories.indexOf(category);
			const next =
				(index + (event.key === 'ArrowRight' ? 1 : settingsCategories.length - 1)) % settingsCategories.length;
			chooseCategory(settingsCategories[next]!);
			dialogRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
		} else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			event.preventDefault();
			const content = contentRef.current;
			if (content) {
				content.scrollTop += event.key === 'ArrowDown' ? 72 : -72;
			}
		}
	};

	const navigateCategory = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
		let next: number;
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
			return;
		}
		if (event.key === 'Home') {
			next = 0;
		} else if (event.key === 'End') {
			next = settingsCategories.length - 1;
		} else {
			return;
		}
		event.preventDefault();
		chooseCategory(settingsCategories[next]!);
		const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
		tabs?.[next]?.focus();
	};

	const chooseLanguage = (option: SupportedLanguage): void => {
		void i18n.changeLanguage(option);
	};

	const clearDefenseArchive = (): void => {
		if (clearState !== 'armed') {
			setClearState('armed');
			return;
		}
		setClearState('clearing');
		void defenseArchiveRepository
			.clearAll()
			.then(() => {
				setClearState('cleared');
				onDefenseArchiveCleared?.();
			})
			.catch(() => setClearState('error'));
	};

	return (
		<div className="settings-panel">
			<button
				ref={triggerRef}
				type="button"
				className="settings-trigger"
				aria-label={t('settings.title')}
				aria-haspopup="dialog"
				aria-expanded={open}
				disabled={disabled}
				onClick={() => setOpen((current) => !current)}
			>
				<SettingsGlyph />
			</button>
			{open
				? createPortal(
						<div
							className="settings-backdrop"
							onMouseDown={(event) => {
								if (event.target !== event.currentTarget) {
									return;
								}
								closeSettings();
							}}
						>
							<div
								ref={dialogRef}
								className="settings-dialog"
								onKeyDown={navigateSettings}
								role="dialog"
								aria-modal="true"
								aria-label={t('settings.title')}
							>
								<header>
									<div>
										<SettingsGlyph />
										<h2>{t('settings.title')}</h2>
									</div>
									<button
										type="button"
										className="settings-close"
										onClick={() => {
											closeSettings();
										}}
										aria-label={t('settings.close')}
									>
										<UiIcon name="close" />
									</button>
								</header>
								<div
									className="settings-categories"
									role="tablist"
									aria-label={t('settings.categories.title')}
								>
									{settingsCategories.map((item) => (
										<button
											key={item}
											id={`${panelId}-tab-${item}`}
											type="button"
											role="tab"
											aria-selected={category === item}
											aria-controls={`${panelId}-content`}
											aria-label={t(`settings.categories.${item}`)}
											title={t(`settings.categories.${item}`)}
											tabIndex={category === item ? 0 : -1}
											onClick={() => chooseCategory(item)}
											onKeyDown={navigateCategory}
										>
											<svg
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="1.8"
												strokeLinecap="square"
												strokeLinejoin="miter"
												aria-hidden="true"
											>
												{item === 'general' ? (
													<>
														<path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h3m4 0h11" />
														<path d="M8 3h4v6H8zM14 9h4v6h-4zM6 15h4v6H6z" />
													</>
												) : item === 'controls' ? (
													<>
														<path d="M2 5h20v14H2zM5 9h1m3 0h1m3 0h1m3 0h2M5 12h1m3 0h1m3 0h1m3 0h2M7 16h10" />
													</>
												) : item === 'info' ? (
													<>
														<circle cx="12" cy="12" r="9" />
														<path d="M12 7v1M10 11h2v6m-2 0h4" />
													</>
												) : (
													<>
														<path d="M3 3h18v5H3zM5 8v13h14V8M9 12h6" />
													</>
												)}
											</svg>
										</button>
									))}
								</div>
								<div
									ref={contentRef}
									className="settings-content"
									role="tabpanel"
									id={`${panelId}-content`}
									aria-labelledby={`${panelId}-tab-${category}`}
									tabIndex={0}
								>
									{category === 'general' ? (
										<>
											<section className="settings-section">
												<div className="settings-section-copy">
													<strong>{t('common.language')}</strong>
													<span>{t('settings.languageDescription')}</span>
												</div>
												<div className="language-options">
													{supportedLanguages.map((option) => (
														<button
															key={option}
															type="button"
															aria-pressed={option === language}
															onClick={() => chooseLanguage(option)}
														>
															<span aria-hidden="true">
																{i18n.getFixedT(option)('settings.languageIcon')}
															</span>
															<b>{i18n.getFixedT(option)('lang.name')}</b>
															<i aria-hidden="true">{option === language ? '✓' : ''}</i>
														</button>
													))}
												</div>
											</section>
											<section className="settings-section settings-auto-pause-section">
												<div className="settings-section-copy">
													<strong>{t('settings.autoPauseTitle')}</strong>
												</div>
												<div
													className="auto-pause-options"
													role="group"
													aria-label={t('settings.autoPauseTitle')}
												>
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
															<b>
																{t(
																	enabled
																		? 'settings.autoPauseEnabled'
																		: 'settings.autoPauseDisabled',
																)}
															</b>
															<i aria-hidden="true">
																{enabled === autoPauseEnabled ? '✓' : ''}
															</i>
														</button>
													))}
												</div>
											</section>
										</>
									) : category === 'controls' ? (
										<KeybindingSettings />
									) : category === 'info' ? (
										<section className="settings-info">
											<header>
												<strong>{t('levelSelect.gameTitle')}</strong>
												<span>{t('levelSelect.version', { date: BUILD_COMMIT_DATE })}</span>
											</header>
											<a
												href={`https://github.com/szdytom/ntd/commit/${BUILD_COMMIT}`}
												target="_blank"
												rel="noreferrer"
											>
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
									) : (
										<section className="settings-section settings-storage-section">
											<div className="settings-section-copy">
												<strong>{t('settings.defenseArchiveTitle')}</strong>
											</div>
											<div className="settings-storage-action">
												<button
													type="button"
													className={clearState === 'armed' ? 'armed' : ''}
													disabled={clearState === 'clearing' || clearState === 'cleared'}
													onClick={clearDefenseArchive}
												>
													{t(
														clearState === 'armed'
															? 'settings.clearDefenseArchiveAgain'
															: clearState === 'clearing'
																? 'settings.clearingDefenseArchive'
																: clearState === 'cleared'
																	? 'settings.defenseArchiveCleared'
																	: 'defenseArchive.clear',
													)}
												</button>
												<span role="status" aria-live="polite">
													{clearState === 'armed'
														? t('settings.clearDefenseArchiveWarning')
														: clearState === 'error'
															? t('settings.clearDefenseArchiveError')
															: ''}
												</span>
											</div>
										</section>
									)}
								</div>
							</div>
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}
