import { useCallback, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { SettingsCategoryIcon } from './settings/SettingsCategoryIcon';
import { SettingsContent, type SettingsCategory } from './settings/SettingsContent';
import type { SettingsArchiveRepository } from './settings/types';
import { SettingsGlyph } from './SettingsGlyph';
import { UiIcon } from './UiIcon';
import { useDialogFocusTrap } from './useDialogFocusTrap';
import styles from './SettingsPanel.module.css';

const settingsCategories: readonly SettingsCategory[] = ['general', 'controls', 'storage', 'info'];

export type { SettingsArchiveRepository } from './settings/types';

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
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [category, setCategory] = useState<SettingsCategory>('general');
	const panelId = useId();
	const contentRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const dialogRef = useRef<HTMLDivElement>(null);

	const closeSettings = useCallback((): void => {
		setOpen(false);
		triggerRef.current?.focus();
	}, []);
	useDialogFocusTrap(open, dialogRef, closeSettings);

	const chooseCategory = (next: SettingsCategory): void => {
		setCategory(next);
		if (contentRef.current) {
			contentRef.current.scrollTop = 0;
		}
	};
	const focusCategory = (index: number): void => {
		chooseCategory(settingsCategories[index]!);
		dialogRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus();
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
			const offset = event.key === 'ArrowRight' ? 1 : settingsCategories.length - 1;
			focusCategory((index + offset) % settingsCategories.length);
			return;
		}
		if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			event.preventDefault();
			if (contentRef.current) {
				contentRef.current.scrollTop += event.key === 'ArrowDown' ? 72 : -72;
			}
		}
	};
	const navigateCategory = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
			return;
		}
		let next: number | null = null;
		if (event.key === 'Home') {
			next = 0;
		} else if (event.key === 'End') {
			next = settingsCategories.length - 1;
		}
		if (next === null) {
			return;
		}
		event.preventDefault();
		focusCategory(next);
	};

	const dialog = (
		<div
			className={styles['settings-backdrop']}
			onMouseDown={(event) => event.target === event.currentTarget && closeSettings()}
		>
			<div
				ref={dialogRef}
				className={styles['settings-dialog']}
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
						className={styles['settings-close']}
						onClick={closeSettings}
						aria-label={t('settings.close')}
					>
						<UiIcon name="close" />
					</button>
				</header>
				<div
					className={styles['settings-categories']}
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
							<SettingsCategoryIcon category={item} />
						</button>
					))}
				</div>
				<div
					ref={contentRef}
					className={styles['settings-content']}
					role="tabpanel"
					id={`${panelId}-content`}
					aria-labelledby={`${panelId}-tab-${category}`}
					tabIndex={0}
				>
					<SettingsContent
						category={category}
						repository={defenseArchiveRepository}
						onCleared={onDefenseArchiveCleared}
					/>
				</div>
			</div>
		</div>
	);

	return (
		<div className={styles['settings-panel']} data-settings-panel>
			<button
				ref={triggerRef}
				type="button"
				className={styles['settings-trigger']}
				data-settings-trigger
				aria-label={t('settings.title')}
				aria-haspopup="dialog"
				aria-expanded={open}
				disabled={disabled}
				onClick={() => setOpen((current) => !current)}
			>
				<SettingsGlyph />
			</button>
			{open ? createPortal(dialog, document.body) : null}
		</div>
	);
}
